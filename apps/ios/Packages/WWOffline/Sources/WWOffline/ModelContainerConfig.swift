import Foundation
import SwiftData

/// Factory for creating the shared SwiftData ModelContainer with all offline models registered.
public enum ModelContainerConfig {

    /// Creates a persistent ModelContainer with all offline models.
    public static func makeContainer() throws -> ModelContainer {
        let schema = Schema([
            CachedTrip.self,
            CachedPlan.self,
            CachedPlanDay.self,
            CachedPlanItem.self,
            CachedAttraction.self,
            CachedWalkingEdge.self,
            WizardDraft.self,
        ])
        let config = ModelConfiguration(isStoredInMemoryOnly: false)
        return try ModelContainer(for: schema, configurations: [config])
    }

    /// Creates an in-memory ModelContainer for testing.
    public static func makeInMemoryContainer() throws -> ModelContainer {
        let schema = Schema([
            CachedTrip.self,
            CachedPlan.self,
            CachedPlanDay.self,
            CachedPlanItem.self,
            CachedAttraction.self,
            CachedWalkingEdge.self,
            WizardDraft.self,
        ])
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        return try ModelContainer(for: schema, configurations: [config])
    }
}
