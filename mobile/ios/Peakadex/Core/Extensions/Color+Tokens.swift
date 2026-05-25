import SwiftUI

extension Color {
    // MARK: - Brand
    static let peakNavyDark    = Color(hex: "#0D2538")
    static let peakNavyMid     = Color(hex: "#5A6E84")
    static let peakNavyLight   = Color(hex: "#94A3B8")
    static let peakGreenCTA    = Color(hex: "#2F7A5F")
    static let peakBrandGreen  = Color(hex: "#4A8C5C")

    // MARK: - Surfaces
    static let peakSurface     = Color(hex: "#F9FAFB")
    static let peakSurfaceSubtle = Color(hex: "#F8FAFC")
    static let peakBackground  = Color(hex: "#F4F7FA")
    static let peakBorderLight = Color(hex: "#E5E7EB")

    // MARK: - Actions
    static let peakBlueActive  = Color(hex: "#0369A1")
    static let peakBlueBg      = Color(hex: "#EFF6FF")

    // MARK: - Hex initializer
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: UInt64
        switch hex.count {
        case 6:
            (r, g, b) = ((int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        default:
            (r, g, b) = (0, 0, 0)
        }
        self.init(
            .sRGB,
            red:   Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: 1
        )
    }
}
