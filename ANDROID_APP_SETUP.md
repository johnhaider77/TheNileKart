# TheNileKart Android App - Complete Setup & Deployment Guide

## Project Status: ✅ Ready for APK Build & Deployment

### Current Infrastructure Setup

#### Web Application (Existing - Running)
- **URL**: https://www.thenilekart.com/
- **Location**: `/home/ubuntu/var/www/thenilekart/TheNileKart/`
- **Backend**: Node.js (PID: 46123)
- **Frontend**: React bundle `main.1c47a5e5.js`
- **Server**: Nginx (reverse proxy)

#### Android Application (New - Ready)
- **Git Branch**: `androidApp`
- **Location**: `/home/ubuntu/var/www/thenilekartAndroid/TheNileKart/`
- **Frontend**: Synced - same bundle as web (`main.1c47a5e5.js`)
- **Backend**: Ready on port 5001
- **Port**: 3001 (Nginx reverse proxy)

---

## Android App Project Structure

```
android-app/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml          (7 permissions configured)
│   │   ├── java/com/thenilekart/
│   │   │   └── MainActivity.kt          (WebView implementation)
│   │   └── res/values/
│   │       ├── colors.xml               (TheNileKart branding)
│   │       ├── strings.xml              (App resources)
│   │       └── themes.xml               (Material Design)
│   ├── build.gradle.kts                 (Kotlin DSL)
│   └── proguard-rules.pro
├── build.gradle.kts
├── settings.gradle.kts
├── gradle/wrapper/                      (Gradle 8.1)
├── gradlew                              (Gradle wrapper script)
└── README.md                            (Comprehensive docs)
```

---

## Building the APK

### Prerequisites
- **Android Studio** (Recommended) OR
- **Android SDK** + **Gradle 8.1** OR
- **Java JDK 11+** (we have Java 21.0.1 ✅)

### Build Method 1: Android Studio (Easiest)

1. Download Android Studio: https://developer.android.com/studio
2. Open the `android-app/` folder
3. Wait for Gradle sync to complete
4. Select: **Build** → **Build Bundle(s)/APK(s)** → **Build APK(s)**
5. APK location: `android-app/app/build/outputs/apk/debug/app-debug.apk`
6. Install on phone or emulator

### Build Method 2: Command Line

```bash
cd android-app

# Clean and build debug APK
./gradlew clean assembleDebug

# Output location
app/build/outputs/apk/debug/app-debug.apk

# For release APK (requires signing key)
./gradlew clean assembleRelease
```

### Build Method 3: Online Build Service

1. Visit: https://www.appsgeyser.com/
2. Upload the `android-app/` folder
3. Select "WebView" mode
4. Configure:
   - App name: "TheNileKart"
   - Website: https://www.thenilekart.com
   - Permissions: Enable camera, location, storage
5. Build and download the APK

---

## APK Specifications

### App Details
- **Package Name**: `com.thenilekart`
- **App Name**: TheNileKart
- **Version**: 1.0 (versionCode: 1)
- **Icon**: Uses TheNileKart logo
- **Theme**: Material Design with TheNileKart pink branding (#F76D9D)

### Permissions (8 Total)
```xml
✓ INTERNET                    (Required for WebView)
✓ ACCESS_NETWORK_STATE        (Network connectivity)
✓ ACCESS_FINE_LOCATION        (GPS location)
✓ ACCESS_COARSE_LOCATION      (Network-based location)
✓ CAMERA                      (Photo uploads)
✓ READ_EXTERNAL_STORAGE       (File uploads)
✓ WRITE_EXTERNAL_STORAGE      (File downloads)
```

### Target Platforms
- **Target SDK**: 33 (Android 13)
- **Minimum SDK**: 24 (Android 7.0)
- **Supported**: Android 7.0 - 14.0
- **Devices**: All modern Android phones and tablets

### WebView Features
- JavaScript enabled
- DOM Storage enabled
- Database Storage enabled
- Caching enabled
- Mixed content support (HTTP + HTTPS)
- Zoom controls enabled
- Wide viewport enabled
- Overview mode enabled

---

## Installation on Android Device

### Prerequisites
- Android phone with Android 7.0+
- USB enabled (for file transfer)
- Settings: Unknown Sources enabled (for sideload installation)

### Installation Steps

1. **Transfer APK to Phone**
   ```bash
   # Via ADB (Android Debug Bridge)
   adb install app-debug.apk
   
   # OR via USB file transfer
   # Copy APK to phone storage and install from file manager
   ```

2. **Via File Manager (Sideload)**
   - Enable "Unknown Sources" in Settings > Security
   - Transfer APK to phone
   - Open file manager
   - Tap the APK file
   - Tap "Install"
   - Grant permissions when prompted
   - Tap "Open" or find "TheNileKart" in app launcher

3. **Via Google Play (After Release)**
   - Build release APK
   - Sign with production key
   - Upload to Google Play Console
   - Configure app listing
   - Submit for review

---

## EC2 Deployment Configuration

### Directory Structure
```
/home/ubuntu/var/www/
├── thenilekart/TheNileKart/                    (Web version)
│   ├── frontend/build/                         (Live)
│   └── backend/                                (Node.js)
│
└── thenilekartAndroid/TheNileKart/             (Android version)
    ├── frontend/build/                         (Synced)
    └── backend/                                (Ready)
```

### Port Configuration
- **Web Frontend**: Port 3000 (Nginx)
- **Web Backend**: Internal Node.js
- **Android Frontend**: Port 3001 (Nginx)
- **Android Backend**: Port 5001 (Node.js)

### Nginx Configuration
```nginx
# Web version
server {
    server_name www.thenilekart.com;
    listen 80;
    location / {
        root /home/ubuntu/var/www/thenilekart/TheNileKart/frontend/build;
        try_files $uri $uri/ /index.html;
    }
}

# Android version
server {
    listen 3001;
    location / {
        root /home/ubuntu/var/www/thenilekartAndroid/TheNileKart/frontend/build;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Testing the Android App

### Local Testing (on EC2)

1. **Test on Android Emulator**
   - Install Android Studio with emulator
   - Build and run: `./gradlew installDebug`
   - Open TheNileKart app from launcher
   - Test navigation, shopping, checkout

2. **Test on Physical Device**
   - Connect via USB
   - Enable Developer Mode and USB Debugging
   - Run: `./gradlew installDebug`
   - Open app and verify all features

### What to Test
- ✓ App launches and loads website
- ✓ Navigation works (clicking links, back button)
- ✓ Shopping cart functions
- ✓ Product browsing and filtering
- ✓ User authentication (login/logout)
- ✓ Checkout and payment
- ✓ Image loading from S3
- ✓ Form submissions
- ✓ Zoom controls work
- ✓ Camera access for uploads

### Test Endpoints
- **App URL**: https://www.thenilekart.com (in WebView)
- **Backend API**: EC2 backend (automatically)
- **Images**: AWS S3 direct URLs
- **Testing Port**: 3001 (for debugging)

---

## Git Workflow for Android App

### Current Branch
```bash
git checkout androidApp
git branch -v
# androidApp  f40ffa5 Fix: Remove unsupported colorActionBar attribute
```

### Adding Changes
```bash
# Make changes to android-app/
git add android-app/

# Commit with clear message
git commit -m "Feature: Add feature description"

# Push to androidApp branch
git push origin androidApp
```

### Keeping Branches Separate
```bash
# Web changes go to main
git checkout main
git pull origin main
# ... make web changes ...
git push origin main

# Android changes go to androidApp
git checkout androidApp
git pull origin androidApp
# ... make android changes ...
git push origin androidApp
```

---

## Frontend Build & Sync Process

### Local Build (Automatic)
```bash
cd /Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/frontend

# Build with legacy peer deps
npm install --legacy-peer-deps
npm run build

# Output: frontend/build/static/js/main.1c47a5e5.js
```

### Sync to EC2 (Web)
```bash
rsync -avz frontend/build/ ubuntu@40.172.190.250:/home/ubuntu/var/www/thenilekart/TheNileKart/frontend/build/
```

### Sync to EC2 (Android)
```bash
rsync -avz frontend/build/ ubuntu@40.172.190.250:/home/ubuntu/var/www/thenilekartAndroid/TheNileKart/frontend/build/
```

---

## Troubleshooting

### APK Build Fails
- **Issue**: `Error: Could not find or load main class`
  - **Solution**: Ensure Android SDK is installed, run `./gradlew --version`

- **Issue**: Missing resources or attributes
  - **Solution**: Run `./gradlew clean` before building

### App Crashes on Launch
- **Issue**: White screen or crash
  - **Solution**: Check MainActivity.kt - ensure website URL is correct

### WebView Shows Blank Page
- **Issue**: Website not loading
  - **Solution**: Verify internet permission in AndroidManifest.xml

### Images Not Loading
- **Issue**: Images from S3 show 404 or CORS error
  - **Solution**: Ensure S3 bucket allows public access, check CORS configuration

### Back Button Doesn't Work
- **Issue**: Back button closes app instead of navigating
  - **Solution**: Verify `onKeyDown()` implementation in MainActivity.kt

---

## Release Checklist

Before publishing to Google Play Store:

- [ ] Update version code and name
- [ ] Create release APK: `./gradlew assembleRelease`
- [ ] Sign APK with production key
- [ ] Test on multiple devices (phones, tablets)
- [ ] Create app store listing (screenshots, description)
- [ ] Configure app details (category, rating, content)
- [ ] Set pricing and distribution countries
- [ ] Submit for review to Google Play Store

---

## Support & Documentation

- **Project README**: `android-app/README.md`
- **Android Studio Docs**: https://developer.android.com/docs
- **Kotlin Docs**: https://kotlinlang.org/docs/
- **Gradle Docs**: https://gradle.org/docs/
- **WebView Best Practices**: https://developer.android.com/develop/ui/views/layout/webapps/webview

---

## Quick Reference

**Build Command**:
```bash
cd android-app && ./gradlew clean assembleDebug
```

**APK Location**:
```
android-app/app/build/outputs/apk/debug/app-debug.apk
```

**Install on Device**:
```bash
./gradlew installDebug
```

**Frontend Build**:
```bash
cd frontend && npm run build && npm install --legacy-peer-deps
```

**Sync Frontend**:
```bash
rsync -avz frontend/build/ ubuntu@40.172.190.250:/home/ubuntu/var/www/thenilekartAndroid/TheNileKart/frontend/build/
```

**Git Status**:
```bash
git checkout androidApp && git status
```

---

**Last Updated**: January 30, 2026
**Status**: ✅ Ready for APK Build & Android Testing
**Branch**: `androidApp`
**Web Site**: https://www.thenilekart.com (Running)
