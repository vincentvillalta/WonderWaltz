import Foundation
import Observation
import UserNotifications
import WWCore
import WWDesignSystem

// MARK: - Plan Data Models

/// Represents an entire plan containing multiple days.
public struct PlanData: Codable, Sendable, Equatable {
    public let id: String
    public let tripId: String
    public let days: [PlanDayData]
    public let forecastConfidence: String?
    public let status: String

    public init(
        id: String,
        tripId: String,
        days: [PlanDayData],
        forecastConfidence: String? = nil,
        status: String = "ready"
    ) {
        self.id = id
        self.tripId = tripId
        self.days = days
        self.forecastConfidence = forecastConfidence
        self.status = status
    }
}

/// Represents a single day within a plan.
public struct PlanDayData: Codable, Sendable, Equatable, Identifiable {
    public var id: String { "\(dayNumber)" }
    public let dayNumber: Int
    public let date: String
    public let parkName: String
    public let parkAbbreviation: String
    public let narrativeIntro: String?
    public let items: [PlanItemData]
    public let isLocked: Bool

    public init(
        dayNumber: Int,
        date: String,
        parkName: String,
        parkAbbreviation: String,
        narrativeIntro: String? = nil,
        items: [PlanItemData] = [],
        isLocked: Bool = false
    ) {
        self.dayNumber = dayNumber
        self.date = date
        self.parkName = parkName
        self.parkAbbreviation = parkAbbreviation
        self.narrativeIntro = narrativeIntro
        self.items = items
        self.isLocked = isLocked
    }
}

/// The type of a plan item.
public enum PlanItemType: String, Codable, Sendable, Equatable {
    case attraction
    case meal
    case show
    case llReminder = "ll_reminder"
    case rest
    case walk
}

/// Represents a single item in the day plan.
public struct PlanItemData: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let type: PlanItemType
    public let name: String
    public let startTime: String
    public let endTime: String?
    public let sortOrder: Int
    public let narrativeTip: String?
    public let walkTimeMinutes: Int?
    public let waitTimeMinutes: Int?
    public let isLightningLane: Bool
    public let isADR: Bool
    public let cuisineType: String?
    public let isMobileOrder: Bool
    public let heightRequirement: String?
    public let durationMinutes: Int?
    public let bookingWindowTime: String?
    public let isCompleted: Bool

    public init(
        id: String,
        type: PlanItemType,
        name: String,
        startTime: String,
        endTime: String? = nil,
        sortOrder: Int = 0,
        narrativeTip: String? = nil,
        walkTimeMinutes: Int? = nil,
        waitTimeMinutes: Int? = nil,
        isLightningLane: Bool = false,
        isADR: Bool = false,
        cuisineType: String? = nil,
        isMobileOrder: Bool = false,
        heightRequirement: String? = nil,
        durationMinutes: Int? = nil,
        bookingWindowTime: String? = nil,
        isCompleted: Bool = false
    ) {
        self.id = id
        self.type = type
        self.name = name
        self.startTime = startTime
        self.endTime = endTime
        self.sortOrder = sortOrder
        self.narrativeTip = narrativeTip
        self.walkTimeMinutes = walkTimeMinutes
        self.waitTimeMinutes = waitTimeMinutes
        self.isLightningLane = isLightningLane
        self.isADR = isADR
        self.cuisineType = cuisineType
        self.isMobileOrder = isMobileOrder
        self.heightRequirement = heightRequirement
        self.durationMinutes = durationMinutes
        self.bookingWindowTime = bookingWindowTime
        self.isCompleted = isCompleted
    }
}

// MARK: - PlanViewModel

/// Manages plan viewing state: loads from API or cache, handles rethink flow,
/// day selection, skip/done tracking, and notification permission request after first plan load.
@Observable
@MainActor
public final class PlanViewModel {

    // MARK: - Public State

    public var plan: PlanData?
    public var selectedDayIndex: Int = 0
    public var isLoading: Bool = false
    public var isRethinking: Bool = false
    public var error: String?
    public var isOffline: Bool = false
    public var completedItemIds: Set<String> = []

    /// Tracks items that have been skipped or marked as done via swipe.
    public var skippedItems: Set<String> = []

    /// The currently selected day's data.
    public var currentDay: PlanDayData? {
        guard let plan, selectedDayIndex >= 0, selectedDayIndex < plan.days.count else {
            return nil
        }
        return plan.days[selectedDayIndex]
    }

    /// All days from the loaded plan.
    public var days: [PlanDayData] {
        plan?.days ?? []
    }

    // MARK: - Dependencies

    private let apiClient: any APIClientProtocol
    private let offlineStore: any OfflineStoreProtocol
    private let analytics: (any AnalyticsProtocol)?

    /// Closure that requests notification authorization. Returns whether granted.
    /// Injectable for testing (defaults to real UNUserNotificationCenter).
    private let requestNotificationAuthorization: @Sendable () async throws -> Bool

    // MARK: - Notification Permission

    /// UserDefaults key for tracking whether notification permission has been requested.
    public static let notificationPermissionKey = "hasRequestedNotificationPermission"

    // MARK: - Init

    public init(
        apiClient: any APIClientProtocol,
        offlineStore: any OfflineStoreProtocol,
        analytics: (any AnalyticsProtocol)? = nil,
        requestNotificationAuthorization: (@Sendable () async throws -> Bool)? = nil
    ) {
        self.apiClient = apiClient
        self.offlineStore = offlineStore
        self.analytics = analytics
        self.requestNotificationAuthorization = requestNotificationAuthorization ?? {
            try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
        }
    }

    // MARK: - Load Plan

    /// Poll the trip until the worker finishes plan generation, then load the plan.
    /// The wizard hands us a tripId; the actual planId only exists once the backend
    /// worker has run. Polls GET /v1/trips/:id every 2s up to `maxAttempts` times.
    public func loadPlanForTrip(tripId: String, maxAttempts: Int = 30) async {
        isLoading = true
        error = nil

        for attempt in 1...maxAttempts {
            do {
                let tripData = try await apiClient.getTrip(id: tripId)
                // Log raw payload every 5 attempts so we can see what the
                // generated client actually returns.
                if attempt == 1 || attempt % 5 == 0 {
                    let preview = String(data: tripData.prefix(400), encoding: .utf8) ?? "(non-utf8)"
                    WWLogger.planView.debug("poll #\(attempt) raw trip body: \(preview, privacy: .public)")
                }
                // Extract current_plan_id from the envelope: { data: { current_plan_id: "..." } }
                if let json = try JSONSerialization.jsonObject(with: tripData) as? [String: Any],
                   let dataObj = json["data"] as? [String: Any],
                   let planId = dataObj["current_plan_id"] as? String, !planId.isEmpty {
                    WWLogger.planView.debug("poll: got planId=\(planId, privacy: .public) from envelope")
                    await loadPlan(planId: planId)
                    return
                }
                if let planId = try? (JSONSerialization.jsonObject(with: tripData) as? [String: Any])?["current_plan_id"] as? String, !planId.isEmpty {
                    WWLogger.planView.debug("poll: got planId=\(planId, privacy: .public) from flat")
                    await loadPlan(planId: planId)
                    return
                }
            } catch {
                // Keep polling unless we've exhausted attempts
                if attempt == maxAttempts {
                    self.error = String(
                        localized: "Unable to load your plan. Please check your connection and try again.",
                        comment: "Plan load error message"
                    )
                    isLoading = false
                    return
                }
            }
            try? await Task.sleep(nanoseconds: 2_000_000_000)
        }

        // Exhausted attempts without current_plan_id being set
        self.error = String(
            localized: "Your plan is taking longer than expected to generate. Please try again.",
            comment: "Plan generation timeout"
        )
        isLoading = false
    }

    /// Load a plan by ID. Tries API first; falls back to offline cache if the request fails.
    /// After first successful load, requests notification permission.
    public func loadPlan(planId: String) async {
        isLoading = true
        error = nil

        do {
            let data = try await apiClient.getPlan(id: planId)
            let decoded = try JSONDecoder().decode(PlanData.self, from: data)
            plan = decoded
            isOffline = false

            // Cache for offline access
            try? await offlineStore.cachePlan(planId: planId, data: data)

            analytics?.capture("plan_viewed", properties: ["plan_id": planId])
            isLoading = false

            // Request notification permission after first plan load (CONTEXT.md locked decision)
            await requestNotificationPermissionIfNeeded()
        } catch {
            // Fallback to cache
            isOffline = true
            do {
                if let cachedData = try await offlineStore.getCachedPlan(planId: planId) {
                    let decoded = try JSONDecoder().decode(PlanData.self, from: cachedData)
                    plan = decoded
                    isLoading = false

                    analytics?.capture("plan_viewed", properties: [
                        "plan_id": planId,
                        "offline": true
                    ])

                    await requestNotificationPermissionIfNeeded()
                    return
                }
            } catch {
                // Cache also failed
            }

            self.error = String(
                localized: "Unable to load your plan. Please check your connection and try again.",
                comment: "Plan load error message"
            )
            isLoading = false
        }
    }

    // MARK: - Day Selection

    /// Select a day by index.
    public func selectDay(index: Int) {
        guard index >= 0, index < days.count else { return }
        selectedDayIndex = index
    }

    // MARK: - Skip / Done

    /// Mark an item as skipped (swipe left).
    public func skipItem(_ id: String) {
        skippedItems.insert(id)
    }

    /// Mark an item as done (swipe right). Adds to skippedItems set (same visual treatment).
    public func markDone(_ id: String) {
        skippedItems.insert(id)
        completedItemIds.insert(id)
    }

    // MARK: - Park Color Mapping

    /// Maps a day's parkName string to the corresponding ParkColor enum.
    public func parkColor(for day: PlanDayData) -> ParkColor {
        let normalized = day.parkName.lowercased()
        if normalized.contains("magic kingdom") {
            return .magicKingdom
        } else if normalized.contains("epcot") {
            return .epcot
        } else if normalized.contains("hollywood") {
            return .hollywoodStudios
        } else if normalized.contains("animal kingdom") {
            return .animalKingdom
        }
        // Default to Magic Kingdom if no match
        return .magicKingdom
    }

    // MARK: - Rethink Today

    /// Rethink today's plan. Sends completed item IDs to the API.
    public func rethinkToday() async {
        guard let plan else { return }

        if isOffline {
            error = String(
                localized: "Connect to internet to rethink your day",
                comment: "Rethink offline error"
            )
            return
        }

        isRethinking = true
        error = nil

        do {
            let data = try await apiClient.rethinkToday(tripId: plan.tripId)
            let decoded = try JSONDecoder().decode(PlanData.self, from: data)
            self.plan = decoded
            completedItemIds.removeAll()
            skippedItems.removeAll()
            isRethinking = false
        } catch {
            self.error = String(
                localized: "Could not rethink your day. Please try again.",
                comment: "Rethink error message"
            )
            isRethinking = false
        }
    }

    // MARK: - Item Completion

    /// Toggle an item's completed state (for rethink-my-day tracking).
    public func toggleItemCompleted(_ itemId: String) {
        if completedItemIds.contains(itemId) {
            completedItemIds.remove(itemId)
        } else {
            completedItemIds.insert(itemId)
        }
    }

    // MARK: - Notification Permission

    /// Request notification permission if not already requested.
    /// Per CONTEXT.md: requested after user sees Day 1 plan for the first time.
    /// Uses UserDefaults guard to request only once.
    public func requestNotificationPermissionIfNeeded() async {
        let defaults = UserDefaults.standard
        guard !defaults.bool(forKey: Self.notificationPermissionKey) else { return }

        // Mark as requested regardless of user's choice
        defaults.set(true, forKey: Self.notificationPermissionKey)

        do {
            let granted = try await requestNotificationAuthorization()
            analytics?.capture("notification_permission_requested", properties: [
                "granted": granted
            ])
        } catch {
            analytics?.capture("notification_permission_requested", properties: [
                "granted": false,
                "error": error.localizedDescription
            ])
        }
    }
}
