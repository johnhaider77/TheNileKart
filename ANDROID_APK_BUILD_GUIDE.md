# TheNileKart Android APK Build & Installation Guide

**Status**: ✅ **APK READY FOR INSTALLATION**

---

## Quick Start: Install APK on Android Phone

### APK File Details
- **File**: `app-debug.apk`
- **Size**: 3.0 MB
- **Location**: Project root: `./app-debug.apk`
- **App Name**: TheNileKart
- **Package Name**: `com.thenilekart`
- **Version**: 1.0 (Build 1)

### Installation Methods

#### Method 1: USB Transfer (Easiest)
1. Connect Android phone to Mac via USB cable
2. Enable "USB Debugging" on phone (Settings → Developer Options → USB Debugging)
3. Transfer APK file to phone storage
   ```bash
   adb push app-debug.apk /sdcard/Download/
   ```
4. Open file manager on phone → Navigate to Downloads → Tap `app-debug.apk`
5. System will ask permission → Tap **Install**
6. App will install as "TheNileKart"

#### Method 2: Email Transfer
1. Email the `app-debug.apk` file to your email
2. Open email on Android phone
3. Download attachment
4. Tap to open → System shows install prompt
5. Tap **Install**

#### Method 3: Google Drive
1. Upload `app-debug.apk` to Google Drive
2. On Android phone, open Google Drive app
3. Download the file to phone storage
4. Open file manager → Tap the APK
5. Tap **Install**

#### Method 4: File Sharing App
1. Use Telegram, WhatsApp, or AirDrop
2. Send APK file to phone
3. Tap the file → Install

---

## After Installation

### First Launch
1. Tap "TheNileKart" app icon on home screen
2. App loads the website: **https://www.thenilekart.com/**
3. WebView displays full e-commerce platform
4. All features work (browse products, login, checkout)

### Permissions
The app will request permissions on first launch:
- ✅ **Camera**: For product photos & user verification
- ✅ **Location**: For delivery address & location-based services
- ✅ **Storage**: For downloading product images & files
- ✅ **Internet**: Required for all functionality

### Testing the App
```
1. Browse Products → Search & filter products
2. Login/Register → Create account or login
3. Add to Cart → Add items to shopping cart
4. Checkout → Complete purchase with COD/Payment
5. Camera Access → Tap profile → Upload photo
6. Back Navigation → Use phone back button to go back
```

---

## Build Information

### Build System
- **Gradle**: 9.3.1 (Latest)
- **Android Gradle Plugin**: 8.4.0
- **Kotlin**: 2.0.10
- **Android SDK**: API 34 (Android 14)
- **Minimum SDK**: API 24 (Android 7.0)
- **Target SDK**: API 34 (Android 14)

### Gradle Configuration
```kotlin
// build.gradle.kts
plugins {
    id("com.android.application") version "8.4.0"
    id("org.jetbrains.kotlin.android") version "2.0.10"
}

android {
    namespace = "com.thenilekart"
    compileSdk = 34
    targetSdk = 34
}
```

### Build Process
**Build Method: Command Line**
```bash
cd android-app
gradle clean assembleDebug

# APK Output Location:
# app/build/outputs/apk/debug/app-debug.apk
```

**Note**: The build must be done in `/tmp` or a path without Unicode characters due to emoji in the project path. This is a macOS Gradle limitation.

---

## Deployment to EC2

### EC2 Setup (New Android Server)
```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Create directory
sudo mkdir -p /home/ubuntu/var/www/thenilekartAndroid/TheNileKart
sudo chown ubuntu:ubuntu /home/ubuntu/var/www/thenilekartAndroid/

# Sync code from local
# (From local machine, in project root)
rsync -av --exclude node_modules --exclude .git android-app/ \
  ubuntu@your-ec2-ip:/home/ubuntu/var/www/thenilekartAndroid/TheNileKart/
```

### Start Frontend Server on EC2 (New Port)
```bash
cd /home/ubuntu/var/www/thenilekartAndroid/TheNileKart/frontend

# Build if not built locally
npm run build

# Start on port 3001
PORT=3001 npm start

# Or using PM2
pm2 start "PORT=3001 npm start" --name "android-frontend"
```

### Start Backend Server on EC2 (New Port)
```bash
cd /home/ubuntu/var/www/thenilekartAndroid/TheNileKart/backend

# Start on port 5001
PORT=5001 node server.js

# Or using PM2
pm2 start "PORT=5001 node server.js" --name "android-backend"
```

### Nginx Configuration (New Android Reverse Proxy)
Add to `/etc/nginx/sites-available/`:
```nginx
server {
    listen 80;
    server_name your-android-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/android /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Existing Website Status

### Main Website: www.thenilekart.com
- **Location**: `/home/ubuntu/var/www/thenilekart/TheNileKart/`
- **Frontend Port**: 3000 (nginx on port 80)
- **Backend Port**: 5000
- **Status**: ✅ **RUNNING - NO CHANGES**

The Android app uses the same backend API but on separate ports:
- **Android Frontend**: Port 3001
- **Android Backend**: Port 5001

---

## File Structure

```
TheNileKart/
├── app-debug.apk                    ← READY TO INSTALL
├── android-app/
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/thenilekart/
│   │   │   │   └── MainActivity.kt     (WebView component)
│   │   │   └── res/
│   │   │       ├── layout/
│   │   │       ├── values/
│   │   │       │   ├── colors.xml      (TheNileKart pink: #F76D9D)
│   │   │       │   └── strings.xml
│   │   │       └── drawable/
│   │   ├── build.gradle.kts
│   │   └── proguard-rules.pro
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── gradle/
│   ├── gradlew
│   └── local.properties
├── frontend/                        (Already built for Android)
├── backend/                         (Ready for Android on port 5001)
└── ...
```

---

## Troubleshooting

### APK Won't Install
**Error**: "Install failed. Package could not be parsed."
**Solution**: 
- Delete any existing TheNileKart app from phone
- Clear phone storage & cache
- Try installing again

### App Shows Blank Screen
**Error**: WebView loads but no content
**Solution**:
- Ensure phone has internet connection
- Check if `https://www.thenilekart.com/` is accessible
- Restart the app
- Clear app cache (Settings → Apps → TheNileKart → Storage → Clear Cache)

### App Keeps Crashing
**Error**: App crashes on launch
**Solution**:
- Uninstall the app completely
- Reinstall APK
- If still crashing, check phone storage (need at least 100MB free)

### Camera Permission Denied
**Error**: "Cannot access camera"
**Solution**:
- Open Settings → Apps → TheNileKart → Permissions
- Enable Camera permission
- Restart app

---

## Version Updates

To build a new version:

1. Update version in `android-app/app/build.gradle.kts`:
   ```kotlin
   versionCode = 2  // Increment this
   versionName = "1.1"
   ```

2. Rebuild:
   ```bash
   cd android-app
   gradle clean assembleDebug
   ```

3. New APK: `app/build/outputs/apk/debug/app-debug.apk`

---

## Support

**Issues with the app?**
- Check internet connection
- Verify phone location is not in restricted region
- Ensure Android 7.0+ (API 24)
- Check app permissions in phone settings

**Need to modify app?**
- Edit `MainActivity.kt` for WebView behavior
- Edit `res/values/strings.xml` for app strings
- Edit `res/values/colors.xml` for app theme
- Rebuild and generate new APK

---

**Last Updated**: January 31, 2026
**Status**: ✅ Ready for Production
