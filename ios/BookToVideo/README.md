# BookToVideo
# Book-to-Video Apple Native App
# Vision Pro / ARKit / RealityKit Application

## Project Structure

```
BookToVideo/
├── App/
│   ├── BookToVideoApp.swift          # Main app entry
│   └── ContentView.swift            # SwiftUI views
├── Features/
│   ├── AR/
│   │   ├── ARSceneView.swift        # ARKit scene rendering
│   │   └── ARSceneManager.swift     # Scene management
│   ├── Immersive/
│   │   ├── ImmersiveVideoView.swift # RealityKit immersive
│   │   └── SpatialAudioManager.swift
│   └── Video/
│       ├── VideoPlayerView.swift    # AVKit video playback
│       └── VideoExporter.swift      # Export to spatial
├── Services/
│   ├── MLService.swift              # Core ML inference
│   ├── VisionService.swift         # Vision framework
│   └── SpeechService.swift         # Speech recognition
├── Models/
│   ├── Scene.swift                  # Scene model
│   ├── Character.swift             # Character model
│   └── VideoProject.swift           # Project model
└── Resources/
    ├── Assets.xcassets
    └── Info.plist
```

## Dependencies

### Swift Package Manager
```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/apple/swift-argument-parser", from: "1.0.0"),
]
```

### Frameworks (Built-in)
- RealityKit
- ARKit
- Vision
- AVFoundation
- Speech
- NaturalLanguage

## Key Features

### 1. AR Book Scanner
```swift
import ARKit
import RealityKit

class ARSceneManager: NSObject, ARSessionDelegate {
    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        // Process scene understanding
    }
}
```

### 2. Immersive Video Player
```swift
import RealityKit

struct ImmersiveVideoView: View {
    let videoURL: URL
    
    var body: some View {
        ImmersiveView {
            let player = AVPlayer(url: videoURL)
            let material = VideoMaterial(avPlayer: player)
            // Configure immersive settings
        }
    }
}
```

### 3. Spatial Video Export
```swift
import AVFoundation
import CoreImage

class SpatialVideoExporter {
    func exportToSpatialFormat(input: URL, output: URL) async throws {
        let asset = AVAsset(url: input)
        // Convert to top-bottom stereo 180°
    }
}
```

## Build & Run

### Prerequisites
- Xcode 16+
- visionOS Simulator or device
- macOS 14+

### Build
```bash
xcodebuild -project BookToVideo.xcodeproj \
  -scheme BookToVideo \
  -configuration Debug \
  -destination 'platform=visionOS' \
  build
```

### Run on Simulator
```bash
xcrun simctl boot "Vision Pro"
xcrun simctl install booted BookToVideo.app
xcrun simctl launch booted com.booktovideo.app
```

## API Integration

### REST API Connection
```swift
class APIClient {
    static let baseURL = "http://localhost:3001/api"
    
    func uploadScene(_ scene: Scene) async throws -> VideoResult {
        // POST /api/scenes/generate
    }
    
    func fetchProject(id: String) async throws -> Project {
        // GET /api/projects/:id
    }
}
```

### WebSocket Real-time Updates
```swift
class WebSocketService {
    private var socket: URLSessionWebSocketTask?
    
    func connect(projectId: String) {
        let url = URL(string: "ws://localhost:3001/ws?projectId=\(projectId)")!
        socket = URLSession.shared.webSocketTask(with: url)
        socket?.resume()
    }
}
```

## Permissions Required

### Info.plist
```xml
<key>NSCameraUsageDescription</key>
<string>Camera access for AR scene scanning</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access for speech recognition</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Photo library access for importing images</string>
```

## Deployment

### Vision Pro
- App Store Connect
- visionOS device required

### iPad/iPhone
- ARKit support required
- A12+ chip recommended

---

*Part of Book-to-Video AI v3.0*
