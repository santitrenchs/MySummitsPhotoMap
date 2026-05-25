import SwiftUI

// Temporary placeholder used during development.
// Replace each instance with the real view when its phase is implemented.
struct PlaceholderView: View {
    let title: String
    let phase: Int

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "hammer.fill")
                .font(.system(size: 48))
                .foregroundStyle(Color.peakBrandGreen)
            Text(title)
                .font(.title2.bold())
                .foregroundStyle(Color.peakNavyDark)
            Text("Fase \(phase)")
                .font(.subheadline)
                .foregroundStyle(Color.peakNavyMid)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.peakBackground)
        .navigationTitle(title)
    }
}
