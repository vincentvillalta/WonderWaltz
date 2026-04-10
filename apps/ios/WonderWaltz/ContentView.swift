import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("WonderWaltz")
                .font(.largeTitle)
                .fontWeight(.bold)
            Text("Hello WonderWaltz")
                .font(.title2)
                .foregroundStyle(.secondary)
            Text("Phase 1 — Foundation")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
