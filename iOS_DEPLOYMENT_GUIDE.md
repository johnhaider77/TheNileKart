# TheNileKart iOS App - Deployment Guide

## Overview
This guide covers building, deploying, and testing the iOS version of TheNileKart e-commerce platform using native WebView wrapper.

## Architecture
- **Language**: Swift with SwiftUI
- **Web Framework**: WKWebView (WebKit)
- **App Type**: Native WebView wrapper loading https://www.thenilekart.com
- **Development**: Xcode 15+
- **Target**: iOS 14.0+

## Project Structure
```
ios-app/
├── TheNileKartApp.xcodeproj/     # Xcode project file
├── TheNileKartApp/               # App source code
│   ├── TheNileKartApp.swift     # App entry point
│   ├── ContentView.swift        # Main WebView UI
│   ├── Info.plist               # App configuration
│   └── Assets.xcassets/         # App icons & assets
└── README.md                    # Documentation
```

## Local Development

### Prerequisites
- Xcode 15.0 or later
- macOS 13.0+
- Swift 5.9+

### Building Locally

1. **Open Xcode Project**:
   ```bash
   open ios-app/TheNileKartApp.xcodeproj
   ```

2. **Select Target & Device**:
   - Select "TheNileKartApp" scheme
   - Choose simulator (iPhone 15 Pro) or connected device

3. **Build & Run**:
   - Press `Cmd + R` or click Play button
   - App will launch in simulator/device

### Features
- ✅ WebView-based e-commerce wrapper
- ✅ Local storage & cookies support
- ✅ Camera & location permissions
- ✅ Refresh button in navigation bar
- ✅ Full e-commerce functionality

## URL Configuration

### Production
**URL**: `https://www.thenilekart.com`
- Default URL for release builds
- No port required (standard HTTPS)

### Testing (EC2)
**Frontend**: http://localhost:3002
**Backend**: http://localhost:5002
- Ports configured for iOS app testing on EC2

## EC2 Deployment

### Directory Structure
```
/home/ubuntu/var/www/thenilekartIOS/TheNileKart/
├── ios-app/           # iOS source code
├── frontend/          # React frontend (built)
└── backend/           # Node.js backend
```

### Deployment Steps

1. **On Local Machine**:
   ```bash
   # Build frontend for iOS
   cd frontend
   npm run build
   
   # Sync iOS app to EC2
   ./sync-ios-to-ec2.sh 40.172.190.250
   ```

2. **On EC2**:
   ```bash
   # SSH to EC2
   ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250
   
   # Navigate to iOS app directory
   cd /home/ubuntu/var/www/thenilekartIOS/TheNileKart
   
   # Start services on ports 3002 & 5002
   ./deploy-ios-services.sh
   ```

3. **Verify Services**:
   ```bash
   # Check frontend
   curl http://localhost:3002
   
   # Check backend
   curl http://localhost:5002/api/health
   ```

## Testing

### Xcode Simulator
1. Open project in Xcode
2. Build & Run (Cmd + R)
3. App loads https://www.thenilekart.com automatically
4. Test all e-commerce features

### Real Device
1. Connect iPhone to Mac via USB
2. In Xcode: Select your device
3. Build & Run (Cmd + R)
4. App installs and launches on device

### Network Testing
- For local testing: Update ContentView.swift URL to `http://localhost:3002`
- For production: Use `https://www.thenilekart.com`

## Troubleshooting

### App Won't Load Website
- Check network connectivity
- Verify port 3002/5002 are accessible
- Check firewall/security groups on EC2

### WebView Issues
- Clear app data in Settings
- Check Info.plist for NSAllowsArbitraryLoads
- Verify JavaScript enabled in WebView config

### Build Errors
- Clean build: Cmd + Shift + K
- Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData/*`
- Update CocoaPods: `pod repo update`

## Git Management

### Branch
- **Branch**: `iosApp`
- **Push**: All changes pushed to `origin/iosApp`

### Workflow
```bash
# Create/switch to iosApp branch
git checkout iosApp

# Make changes
# ... modify files ...

# Commit changes
git add .
git commit -m "Your commit message"

# Push to origin
git push origin iosApp
```

## Servers Running

### Main Website (Production)
- **Frontend**: http://www.thenilekart.com (port 3000)
- **Backend**: API on port 5000
- **Status**: Always running

### Android App
- **Frontend**: http://localhost:3001 (EC2)
- **Backend**: http://localhost:5001 (EC2)
- **Status**: Running on separate ports

### iOS App (This App)
- **Frontend**: http://localhost:3002 (EC2)
- **Backend**: http://localhost:5002 (EC2)
- **Status**: Can be started/stopped as needed

## Key Configuration Files

### ContentView.swift
- Main WebView component
- URL configuration: `https://www.thenilekart.com`
- Refresh button for page reload

### Info.plist
- App metadata (name, version, identifier)
- Network security settings (allows arbitrary loads)
- Required device capabilities

### TheNileKartApp.swift
- App entry point
- Scene configuration
- Window management

## Important Notes

1. **Port Isolation**: iOS app (3002/5002) is completely separate from:
   - Main website (3000/5000)
   - Android app (3001/5001)

2. **Domain**: App uses production domain (www.thenilekart.com) by default
   - No local development needed for basic testing
   - Only modify ContentView.swift for testing on specific ports

3. **No Action Bar**: Unlike Android, iOS doesn't show ActionBar
   - Navigation title is managed by SwiftUI NavigationView
   - Keep navigation minimal to focus on web content

4. **Persistent Data**: WebView maintains cookies & localStorage
   - Users stay logged in between app sessions
   - Shopping cart persists across app restarts

## Next Steps

1. ✅ Build frontend locally: `npm run build`
2. ✅ Sync to EC2: `./sync-ios-to-ec2.sh 40.172.190.250`
3. ✅ Start services: SSH to EC2 and run `./deploy-ios-services.sh`
4. ✅ Open in Xcode: `open ios-app/TheNileKartApp.xcodeproj`
5. ✅ Build & Run: Press Cmd + R in Xcode

## Support

For issues or questions, refer to:
- Xcode Documentation: https://developer.apple.com/documentation/
- Swift Documentation: https://swift.org/
- WebKit Documentation: https://developer.apple.com/documentation/webkit/
