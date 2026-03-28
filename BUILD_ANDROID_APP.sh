#!/bin/bash

# TheNileKart Android App Build Instructions

echo "🏗️ TheNileKart Android App Build Guide"
echo "========================================"
echo ""

PROJECT_ROOT="/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart"
ANDROID_PROJECT="$PROJECT_ROOT/android-app"

echo "📋 Step 1: Build Information"
echo "   Project: TheNileKart Android"
echo "   Min SDK: 24 (Android 7.0)"
echo "   Target SDK: 35 (Android 15)"
echo "   App ID: com.example.thenilekart"
echo "   Version: 1.3 (Build 4)"
echo ""

echo "🔍 Step 2: Checking Android Environment"
if command -v gradle &> /dev/null; then
    echo "✅ Gradle is installed"
else
    echo "⚠️ Gradle not found. Please install Android SDK/Gradle"
    exit 1
fi

echo ""
echo "🔨 Step 3: Building APK Release"
cd "$ANDROID_PROJECT"

echo ""
echo "Running: ./gradlew clean bundleRelease"
./gradlew clean bundleRelease 2>&1 | tail -50

if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
    echo ""
    echo "✅ Release Bundle (AAB) built successfully!"
    echo "   Location: app/build/outputs/bundle/release/app-release.aab"
    ls -lh "app/build/outputs/bundle/release/app-release.aab"
    
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Upload AAB to Google Play Store"
    echo "   2. Or build APK: ./gradlew assembleRelease"
else
    echo "❌ Build failed. Check logs above."
    exit 1
fi

echo ""
echo "📱 Important Notes:"
echo "   ✅ PushNotificationService is now registered in AndroidManifest"
echo "   ✅ Firebase Cloud Messaging is configured"
echo "   ✅ Notification permissions set for Android 13+"
echo "   ✅ google-services.json is in place"
echo ""
echo "🚀 Once you rebuild and install the app:"
echo "   1. User will receive real FCM tokens (not test tokens)"
echo "   2. Notifications will be delivered to the device"
echo "   3. The app will show notifications when sent from the seller panel"
echo ""
