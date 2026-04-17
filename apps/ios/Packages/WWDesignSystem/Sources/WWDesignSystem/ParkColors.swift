import SwiftUI

/// Maps each Walt Disney World park to its canonical brand color.
/// Colors sourced from theme.css park-coded accents:
/// MK: #FF6B9D, EPCOT: #00BFA5, HS: #E63946, AK: #06D6A0
public enum ParkColor: String, CaseIterable, Sendable {
    case magicKingdom
    case epcot
    case hollywoodStudios
    case animalKingdom

    /// The park's canonical brand color from WWDesignTokens.
    public var color: Color {
        switch self {
        case .magicKingdom: WWDesignTokens.colorParkMagicKingdom
        case .epcot: WWDesignTokens.colorParkEpcot
        case .hollywoodStudios: WWDesignTokens.colorParkHollywoodStudios
        case .animalKingdom: WWDesignTokens.colorParkAnimalKingdom
        }
    }

    /// A representative emoji for the park.
    public var emoji: String {
        switch self {
        case .magicKingdom: "\u{1F3F0}" // castle
        case .epcot: "\u{1F30D}" // globe
        case .hollywoodStudios: "\u{1F3AC}" // clapper board
        case .animalKingdom: "\u{1F981}" // lion
        }
    }

    /// Short abbreviation (MK, EPCOT, HS, AK).
    public var shortName: String {
        switch self {
        case .magicKingdom: "MK"
        case .epcot: "EPCOT"
        case .hollywoodStudios: "HS"
        case .animalKingdom: "AK"
        }
    }

    /// Full display name.
    public var displayName: String {
        switch self {
        case .magicKingdom: "Magic Kingdom"
        case .epcot: "EPCOT"
        case .hollywoodStudios: "Hollywood Studios"
        case .animalKingdom: "Animal Kingdom"
        }
    }

    /// Tinted background at 10% opacity for card backgrounds.
    public var tintedBackground: Color {
        color.opacity(0.1)
    }
}
