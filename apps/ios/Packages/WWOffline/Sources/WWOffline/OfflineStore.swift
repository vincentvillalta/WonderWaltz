import Foundation
import SwiftData
import WWCore

// MARK: - Sendable Data Transfer Types

/// Lightweight struct for cross-actor plan data transfer.
public struct CachedPlanData: Sendable, Equatable {
    public let id: String
    public let tripId: String
    public let status: String
    public let version: Int
    public let forecastDisclaimer: String?
    public let lastSyncedAt: Date
    public let isDownloadComplete: Bool
    public let days: [CachedPlanDayData]

    public init(
        id: String,
        tripId: String,
        status: String,
        version: Int,
        forecastDisclaimer: String?,
        lastSyncedAt: Date,
        isDownloadComplete: Bool,
        days: [CachedPlanDayData]
    ) {
        self.id = id
        self.tripId = tripId
        self.status = status
        self.version = version
        self.forecastDisclaimer = forecastDisclaimer
        self.lastSyncedAt = lastSyncedAt
        self.isDownloadComplete = isDownloadComplete
        self.days = days
    }
}

/// Lightweight struct for cross-actor day data transfer.
public struct CachedPlanDayData: Sendable, Equatable {
    public let id: String
    public let dayNumber: Int
    public let date: Date
    public let parkId: String
    public let parkName: String
    public let narrativeIntro: String?
    public let narrativeTip: String?
    public let isLocked: Bool
    public let items: [CachedPlanItemData]

    public init(
        id: String,
        dayNumber: Int,
        date: Date,
        parkId: String,
        parkName: String,
        narrativeIntro: String?,
        narrativeTip: String?,
        isLocked: Bool,
        items: [CachedPlanItemData]
    ) {
        self.id = id
        self.dayNumber = dayNumber
        self.date = date
        self.parkId = parkId
        self.parkName = parkName
        self.narrativeIntro = narrativeIntro
        self.narrativeTip = narrativeTip
        self.isLocked = isLocked
        self.items = items
    }
}

/// Lightweight struct for cross-actor item data transfer.
public struct CachedPlanItemData: Sendable, Equatable {
    public let id: String
    public let type: String
    public let refId: String?
    public let name: String
    public let startTime: String
    public let endTime: String
    public let waitMinutes: Int?
    public let walkMinutes: Int?
    public let narrativeTip: String?
    public let sortOrder: Int

    public init(
        id: String,
        type: String,
        refId: String?,
        name: String,
        startTime: String,
        endTime: String,
        waitMinutes: Int?,
        walkMinutes: Int?,
        narrativeTip: String?,
        sortOrder: Int
    ) {
        self.id = id
        self.type = type
        self.refId = refId
        self.name = name
        self.startTime = startTime
        self.endTime = endTime
        self.waitMinutes = waitMinutes
        self.walkMinutes = walkMinutes
        self.narrativeTip = narrativeTip
        self.sortOrder = sortOrder
    }
}

/// Lightweight struct for cross-actor wizard draft transfer.
public struct WizardDraftData: Sendable, Equatable {
    public let startDate: Date?
    public let endDate: Date?
    public let selectedParkIds: [String]
    public let hasHopper: Bool
    public let guestsJSON: String
    public let budgetTier: String?
    public let lodgingType: String?
    public let transportType: String?
    public let mustDoRideIds: [String]
    public let mealPreferences: [String]
    public let currentStep: Int
    public let createdAt: Date
    public let updatedAt: Date

    public init(
        startDate: Date? = nil,
        endDate: Date? = nil,
        selectedParkIds: [String] = [],
        hasHopper: Bool = false,
        guestsJSON: String = "[]",
        budgetTier: String? = nil,
        lodgingType: String? = nil,
        transportType: String? = nil,
        mustDoRideIds: [String] = [],
        mealPreferences: [String] = [],
        currentStep: Int = 0,
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.startDate = startDate
        self.endDate = endDate
        self.selectedParkIds = selectedParkIds
        self.hasHopper = hasHopper
        self.guestsJSON = guestsJSON
        self.budgetTier = budgetTier
        self.lodgingType = lodgingType
        self.transportType = transportType
        self.mustDoRideIds = mustDoRideIds
        self.mealPreferences = mealPreferences
        self.currentStep = currentStep
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

/// Lightweight struct for cross-actor attraction data transfer.
public struct AttractionData: Sendable, Equatable {
    public let id: String
    public let name: String
    public let parkId: String
    public let latitude: Double?
    public let longitude: Double?
    public let heightRequirementInches: Int?
    public let tags: [String]
    public let lightningLaneType: String?

    public init(
        id: String,
        name: String,
        parkId: String,
        latitude: Double? = nil,
        longitude: Double? = nil,
        heightRequirementInches: Int? = nil,
        tags: [String] = [],
        lightningLaneType: String? = nil
    ) {
        self.id = id
        self.name = name
        self.parkId = parkId
        self.latitude = latitude
        self.longitude = longitude
        self.heightRequirementInches = heightRequirementInches
        self.tags = tags
        self.lightningLaneType = lightningLaneType
    }
}

/// Lightweight struct for cross-actor walking edge data transfer.
public struct WalkingEdgeData: Sendable, Equatable {
    public let fromId: String
    public let toId: String
    public let walkMinutes: Double

    public init(fromId: String, toId: String, walkMinutes: Double) {
        self.fromId = fromId
        self.toId = toId
        self.walkMinutes = walkMinutes
    }
}

// MARK: - OfflineStore

/// Concrete implementation of OfflineStoreProtocol using SwiftData.
/// Uses @ModelActor for background operations — never blocks main thread.
@ModelActor
public actor OfflineStore: OfflineStoreProtocol {

    // MARK: - OfflineStoreProtocol conformance

    public func cachePlan(planId: String, data: Data) async throws {
        // Decode the plan data into our transfer struct, then persist
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let planData = try decoder.decode(CachedPlanData.self, from: data)

        // Delete existing plan with same ID (upsert)
        let existingDescriptor = FetchDescriptor<CachedPlan>(
            predicate: #Predicate { $0.id == planId }
        )
        let existing = try modelContext.fetch(existingDescriptor)
        for plan in existing {
            modelContext.delete(plan)
        }

        // Insert new plan
        let plan = CachedPlan(
            id: planData.id,
            tripId: planData.tripId,
            status: planData.status,
            version: planData.version,
            forecastDisclaimer: planData.forecastDisclaimer,
            lastSyncedAt: planData.lastSyncedAt,
            isDownloadComplete: planData.isDownloadComplete
        )
        modelContext.insert(plan)

        for dayData in planData.days {
            let day = CachedPlanDay(
                id: dayData.id,
                dayNumber: dayData.dayNumber,
                date: dayData.date,
                parkId: dayData.parkId,
                parkName: dayData.parkName,
                narrativeIntro: dayData.narrativeIntro,
                narrativeTip: dayData.narrativeTip,
                isLocked: dayData.isLocked
            )
            day.plan = plan
            modelContext.insert(day)

            for itemData in dayData.items {
                let item = CachedPlanItem(
                    id: itemData.id,
                    type: itemData.type,
                    refId: itemData.refId,
                    name: itemData.name,
                    startTime: itemData.startTime,
                    endTime: itemData.endTime,
                    waitMinutes: itemData.waitMinutes,
                    walkMinutes: itemData.walkMinutes,
                    narrativeTip: itemData.narrativeTip,
                    sortOrder: itemData.sortOrder
                )
                item.day = day
                modelContext.insert(item)
            }
        }

        try modelContext.save()
    }

    public func getCachedPlan(planId: String) async throws -> Data? {
        let descriptor = FetchDescriptor<CachedPlan>(
            predicate: #Predicate { $0.id == planId }
        )
        guard let plan = try modelContext.fetch(descriptor).first else {
            return nil
        }

        let dayDatas = (plan.days).map { day in
            let itemDatas = (day.items).sorted { $0.sortOrder < $1.sortOrder }.map { item in
                CachedPlanItemData(
                    id: item.id,
                    type: item.type,
                    refId: item.refId,
                    name: item.name,
                    startTime: item.startTime,
                    endTime: item.endTime,
                    waitMinutes: item.waitMinutes,
                    walkMinutes: item.walkMinutes,
                    narrativeTip: item.narrativeTip,
                    sortOrder: item.sortOrder
                )
            }
            return CachedPlanDayData(
                id: day.id,
                dayNumber: day.dayNumber,
                date: day.date,
                parkId: day.parkId,
                parkName: day.parkName,
                narrativeIntro: day.narrativeIntro,
                narrativeTip: day.narrativeTip,
                isLocked: day.isLocked,
                items: itemDatas
            )
        }.sorted { $0.dayNumber < $1.dayNumber }

        let planData = CachedPlanData(
            id: plan.id,
            tripId: plan.tripId,
            status: plan.status,
            version: plan.version,
            forecastDisclaimer: plan.forecastDisclaimer,
            lastSyncedAt: plan.lastSyncedAt,
            isDownloadComplete: plan.isDownloadComplete,
            days: dayDatas
        )

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return try encoder.encode(planData)
    }

    public func isCached(planId: String) async -> Bool {
        var descriptor = FetchDescriptor<CachedPlan>(
            predicate: #Predicate { $0.id == planId }
        )
        descriptor.fetchLimit = 1
        let count = (try? modelContext.fetchCount(descriptor)) ?? 0
        return count > 0
    }

    public func clearCache() async throws {
        // Delete in relationship order to avoid batch delete constraint violations.
        // Fetch-then-delete (not batch) respects cascade rules.
        let items = try modelContext.fetch(FetchDescriptor<CachedPlanItem>())
        for item in items { modelContext.delete(item) }

        let days = try modelContext.fetch(FetchDescriptor<CachedPlanDay>())
        for day in days { modelContext.delete(day) }

        let plans = try modelContext.fetch(FetchDescriptor<CachedPlan>())
        for plan in plans { modelContext.delete(plan) }

        let trips = try modelContext.fetch(FetchDescriptor<CachedTrip>())
        for trip in trips { modelContext.delete(trip) }

        let attractions = try modelContext.fetch(FetchDescriptor<CachedAttraction>())
        for attraction in attractions { modelContext.delete(attraction) }

        let edges = try modelContext.fetch(FetchDescriptor<CachedWalkingEdge>())
        for edge in edges { modelContext.delete(edge) }

        let drafts = try modelContext.fetch(FetchDescriptor<WizardDraft>())
        for draft in drafts { modelContext.delete(draft) }

        try modelContext.save()
    }

    // MARK: - Extended operations

    /// Save or update a wizard draft (upsert: delete old + insert new).
    public func saveWizardDraft(_ draft: WizardDraftData) throws {
        // Delete all existing drafts (fetch-then-delete to avoid batch delete issues)
        let existing = try modelContext.fetch(FetchDescriptor<WizardDraft>())
        for old in existing { modelContext.delete(old) }

        let model = WizardDraft(
            startDate: draft.startDate,
            endDate: draft.endDate,
            selectedParkIds: draft.selectedParkIds,
            hasHopper: draft.hasHopper,
            guestsJSON: draft.guestsJSON,
            budgetTier: draft.budgetTier,
            lodgingType: draft.lodgingType,
            transportType: draft.transportType,
            mustDoRideIds: draft.mustDoRideIds,
            mealPreferences: draft.mealPreferences,
            currentStep: draft.currentStep,
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt
        )
        modelContext.insert(model)
        try modelContext.save()
    }

    /// Load the most recent wizard draft as a plain struct.
    public func loadWizardDraft() -> WizardDraftData? {
        var descriptor = FetchDescriptor<WizardDraft>(
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        descriptor.fetchLimit = 1

        guard let draft = try? modelContext.fetch(descriptor).first else {
            return nil
        }

        return WizardDraftData(
            startDate: draft.startDate,
            endDate: draft.endDate,
            selectedParkIds: draft.selectedParkIds,
            hasHopper: draft.hasHopper,
            guestsJSON: draft.guestsJSON,
            budgetTier: draft.budgetTier,
            lodgingType: draft.lodgingType,
            transportType: draft.transportType,
            mustDoRideIds: draft.mustDoRideIds,
            mealPreferences: draft.mealPreferences,
            currentStep: draft.currentStep,
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt
        )
    }

    /// Bulk insert catalog attractions for offline access.
    public func cacheAttractions(_ attractions: [AttractionData]) throws {
        for data in attractions {
            let model = CachedAttraction(
                id: data.id,
                name: data.name,
                parkId: data.parkId,
                latitude: data.latitude,
                longitude: data.longitude,
                heightRequirementInches: data.heightRequirementInches,
                tags: data.tags,
                lightningLaneType: data.lightningLaneType
            )
            modelContext.insert(model)
        }
        try modelContext.save()
    }

    /// Bulk insert walking graph edges for offline routing.
    public func cacheWalkingGraph(_ edges: [WalkingEdgeData]) throws {
        for data in edges {
            let model = CachedWalkingEdge(
                fromId: data.fromId,
                toId: data.toId,
                walkMinutes: data.walkMinutes
            )
            modelContext.insert(model)
        }
        try modelContext.save()
    }

    /// Mark a plan's offline package as download complete.
    public func markDownloadComplete(planId: String) throws {
        let descriptor = FetchDescriptor<CachedPlan>(
            predicate: #Predicate { $0.id == planId }
        )
        guard let plan = try modelContext.fetch(descriptor).first else { return }
        plan.isDownloadComplete = true
        try modelContext.save()
    }

    /// Get the last sync date for a plan.
    public func getLastSyncDate(planId: String) -> Date? {
        let descriptor = FetchDescriptor<CachedPlan>(
            predicate: #Predicate { $0.id == planId }
        )
        return try? modelContext.fetch(descriptor).first?.lastSyncedAt
    }
}

// MARK: - Codable conformance for data transfer types

extension CachedPlanData: Codable {}
extension CachedPlanDayData: Codable {}
extension CachedPlanItemData: Codable {}
