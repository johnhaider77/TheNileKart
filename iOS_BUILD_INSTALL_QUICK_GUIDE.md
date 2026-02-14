# iOS App Build & Installation Quick Guide

## Prerequisites

```bash
# Check Xcode is installed
xcode-select -p

# Check CocoaPods is installed
pod --version

# If CocoaPods not installed:
sudo gem install cocoapods
```

## Step 1: Navigate to iOS App Directory

```bash
cd "/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/ios-app"
```

## Step 2: Install/Update CocoaPods Dependencies

```bash
pod install
```

**Expected output:**
```
Pod installation complete! There are X dependencies from the Podfile.
Pods written to Workspace: TheNileKartApp.xcworkspace
```

## Step 3: Find Your Device UDID

### Option A: Using Xcode
1. Connect iPhone via USB
2. Open Xcode
3. Menu → Window → Devices and Simulators
4. Select your device in left sidebar
5. Copy the "Identifier" value (e.g., `00008150-0016554E3412401C`)

### Option B: Using Terminal
```bash
# List all connected devices
system_profiler SPUSBDataType | grep "Serial Number:"

# Or use xcode-select
instruments -s devices 2>/dev/null | grep "iPhone" | awk '{print $NF}' | sed 's/[()]//g'
```

## Step 4: Clean Previous Builds (Recommended)

```bash
rm -rf build/
rm -rf derived*/
xcodebuild -scheme TheNileKartApp -configuration Release clean
```

## Step 5: Build for Physical Device

Replace `YOUR_DEVICE_UDID` with your actual device ID:

```bash
# For Release build (optimized)
xcodebuild -scheme TheNileKartApp \
  -configuration Release \
  -derivedDataPath build \
  -destination 'platform=iOS,id=YOUR_DEVICE_UDID'
```

**Example with actual UDID:**
```bash
xcodebuild -scheme TheNileKartApp \
  -configuration Release \
  -derivedDataPath build \
  -destination 'platform=iOS,id=00008150-0016554E3412401C'
```

## Step 6: Install to Device

```bash
xcodebuild -scheme TheNileKartApp \
  -configuration Release \
  -derivedDataPath build \
  -destination 'platform=iOS,id=YOUR_DEVICE_UDID' \
  install
```

## Step 7: Verify Installation

```bash
# Check if app is installed (after installation, look on your device home screen)
# The "TheNileKart" app should appear on your device

# Or check via Xcode:
# Open Xcode → Window → Devices and Simulators
# Select device → Installed Apps → Look for "TheNileKart"
```

## Running the App

1. Unlock your iOS device
2. Find "TheNileKart" app on home screen
3. Tap to launch
4. Accept notification permission prompt when asked
5. Check Xcode console for debug logs

## Checking Console Output

### In Xcode:
```
1. Window → Devices and Simulators
2. Select your device
3. View Device Logs button
4. Run app and watch logs in real-time
```

### Or use Console.app:
```
1. Spotlight Search: "Console"
2. Device: YOUR_DEVICE
3. Filter: TheNileKart
```

## Expected Console Output on Launch

```
🚀 TheNileKart App initializing...
🚀 AppDelegate initializing...
🔥 Firebase configured successfully
🔧 Setting up push notifications...
✅ User granted notification permission, registering for remote notifications
📤 Fetching FCM token from Firebase...
✅ Real FCM Token retrieved successfully!
🔐 Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
📏 Token length: 192 characters
```

## Troubleshooting Build Issues

### Issue: Pod installation fails
```bash
# Clear pod cache
rm -rf ~/Library/Developer/Xcode/DerivedData/
pod cache clean --all
pod install
```

### Issue: "Unknown device type 'platform=iOS'"
```bash
# Use correct platform identifier
# iOS device: platform=iOS
# Simulator: platform=iOS\ Simulator

# Verify available destinations:
xcodebuild -scheme TheNileKartApp -showdestinations
```

### Issue: "App could not be installed at this time"
```bash
# Device storage full - free up space on iPhone
# Or try manual installation:
# Settings → General → iPhone Storage → Delete Unused Apps
```

### Issue: "Unable to find device matching UDID"
```bash
# Device not connected properly
# 1. Disconnect and reconnect USB cable
# 2. Tap "Trust" on device when prompted
# 3. Retry: instruments -s devices
```

### Issue: "Code signing errors"
```bash
# Check signing identity
xcodebuild -scheme TheNileKartApp -showBuildSettings | grep CODE_SIGN

# Or fix through Xcode:
# 1. Open TheNileKartApp.xcworkspace
# 2. Select project → TheNileKartApp target
# 3. Signing & Capabilities tab
# 4. Team dropdown → Select your Apple ID
```

## Build Profile Switching

### Debug Build (with logs)
```bash
xcodebuild -scheme TheNileKartApp \
  -configuration Debug \
  -derivedDataPath build \
  -destination 'platform=iOS,id=YOUR_DEVICE_UDID'
```

### Release Build (optimized, ~30% smaller)
```bash
xcodebuild -scheme TheNileKartApp \
  -configuration Release \
  -derivedDataPath build \
  -destination 'platform=iOS,id=YOUR_DEVICE_UDID'
```

## Uninstalling the App from Device

```bash
# Via Xcode
xcode-select -p  # Confirm Xcode path
xcrun simctl uninstall YOUR_DEVICE_UDID com.example.TheNileKart

# Or manually on device:
# Press and hold app → Remove → Remove App → Delete App
```

## Advanced: Building with Custom Bundle ID

If you need to change bundle ID:

```bash
# Edit in Xcode and rebuild, or:
xcodebuild -scheme TheNileKartApp \
  -configuration Release \
  -derivedDataPath build \
  -destination 'platform=iOS,id=YOUR_DEVICE_UDID' \
  PRODUCT_BUNDLE_IDENTIFIER="com.yourcompany.thenilekart"
```

## Performance: Build Times

- First build: ~5-10 minutes (downloads pods, compiles)
- Incremental build: ~30-60 seconds
- Clean build: ~3-5 minutes

## Key Build Files Location

```
ios-app/
├── TheNileKartApp/
│   ├── TheNileKartApp.swift         # Main app code (Firebase integration here)
│   ├── ContentView.swift             # UI components
│   └── Assets.xcassets/              # App icons, images
├── TheNileKartApp.xcodeproj/
│   └── project.pbxproj              # Build configuration
├── TheNileKartApp.xcworkspace/
│   └── contents.xcworkspace         # CocoaPods workspace
├── Podfile                           # CocoaPods dependencies (Firebase)
├── Podfile.lock                      # Pod versions lock file
└── Pods/                             # Downloaded Firebase SDK
```

## Firebase SDK Details in Pods

```
Pods/
├── Firebase/                         # Main Firebase SDK
├── FirebaseMessaging/                # Push notifications
├── FirebaseCore/                     # Core SDK
└── FirebaseInstallations/            # Device identification
```

## Next: Test Push Notifications

After successful installation:
1. App should request notification permission
2. Grant permission (tap "Allow")
3. Check console for FCM token
4. Send test notification from dashboard
5. Verify notification appears on device

See: **iOS_FCM_TESTING_COMPLETE.md** for full testing guide
