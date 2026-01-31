# TheNileKart Android App

A native Android WebView wrapper for TheNileKart e-commerce platform, allowing users to access the website through a native Android application.

## Features

- **Native Android App**: Distributed through Google Play Store
- **WebView Integration**: Displays the TheNileKart website in a WebView container
- **Full-Screen Experience**: Optimized for mobile devices
- **JavaScript Support**: Enables interactive features and JavaScript functionality
- **Local Storage**: Supports DOM storage and database caching
- **Location Services**: Access to GPS and network-based location
- **Camera Access**: Upload photos for product reviews and authentication
- **File Management**: Read and write external storage for file operations
- **Navigation History**: Back button support for WebView history

## Project Structure

```
android-app/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── AndroidManifest.xml          # App permissions and manifest
│   │       ├── java/com/thenilekart/
│   │       │   └── MainActivity.kt          # Main WebView activity
│   │       └── res/
│   │           ├── layout/
│   │           │   └── activity_main.xml    # Main activity layout
│   │           └── values/
│   │               ├── colors.xml           # App color palette
│   │               ├── strings.xml          # String resources
│   │               └── themes.xml           # App themes
│   ├── build.gradle.kts                     # App-level Gradle configuration
│   └── proguard-rules.pro                   # ProGuard obfuscation rules
├── build.gradle.kts                         # Root Gradle configuration
├── settings.gradle.kts                      # Project settings
└── gradle/
    └── wrapper/
        └── gradle-wrapper.properties        # Gradle wrapper configuration
```

## Build Requirements

- **Android Studio**: 4.2 or newer
- **Android SDK**: API 24 (Android 7.0) minimum
- **Target SDK**: API 33 (Android 13)
- **Gradle**: 7.6.1+
- **Java/Kotlin**: 1.8+

## Build Instructions

### Step 1: Prerequisites

1. Install Android Studio from [developer.android.com](https://developer.android.com/studio)
2. Install Android SDK (minimum API 24, target API 33)
3. Install Gradle 7.6.1 or use the bundled Gradle wrapper

### Step 2: Build the Debug APK

```bash
cd android-app
./gradlew assembleDebug
```

The APK will be generated at: `app/build/outputs/apk/debug/app-debug.apk`

### Step 3: Build the Release APK (Production)

```bash
cd android-app
./gradlew assembleRelease
```

The signed release APK will be generated at: `app/build/outputs/apk/release/app-release.apk`

**Note**: For release builds, you'll need to configure a signing key in `app/build.gradle.kts`

## Configuration

### Website URL

The target website URL is configured in `MainActivity.kt`:

```kotlin
private val WEBSITE_URL = "https://www.thenilekart.com"
```

To change the URL, modify the `WEBSITE_URL` constant.

### App Branding

Colors and branding are defined in:
- `res/values/colors.xml` - App color palette
- `res/values/themes.xml` - Theme styling
- `res/values/strings.xml` - App name and strings

### WebView Settings

Fine-tune WebView behavior in `MainActivity.kt`:

```kotlin
val webSettings: WebSettings = webView.settings
webSettings.javaScriptEnabled = true              // Enable JavaScript
webSettings.domStorageEnabled = true              // Enable DOM storage
webSettings.databaseEnabled = true                // Enable database
webSettings.cacheMode = WebSettings.LOAD_DEFAULT  // Cache strategy
webSettings.useWideViewPort = true                // Wide viewport
webSettings.loadWithOverviewMode = true           // Overview mode
webSettings.setMixedContentMode(...)              // Mixed content policy
webSettings.builtInZoomControls = true            // Zoom controls
```

## Features

### WebView Configuration

- **JavaScript**: Enabled for interactive web content
- **Storage**: DOM storage and database enabled for app state
- **Caching**: Configured for optimal performance
- **Zoom**: Built-in zoom controls without display controls
- **Mixed Content**: Allows both HTTP and HTTPS content
- **User Agent**: Custom user agent identifies Android app version

### Navigation

- **WebViewClient**: Keeps all navigation within the app
- **Back Button**: Supports WebView history navigation
- **WebChromeClient**: Handles JavaScript dialogs and progress

### Permissions

The app requires the following permissions (defined in `AndroidManifest.xml`):

- `INTERNET` - Required for WebView
- `ACCESS_NETWORK_STATE` - Check network connectivity
- `ACCESS_FINE_LOCATION` - GPS location services
- `ACCESS_COARSE_LOCATION` - Network-based location
- `CAMERA` - Camera access for uploads
- `READ_EXTERNAL_STORAGE` - Read files from device
- `WRITE_EXTERNAL_STORAGE` - Write files to device

## Installation

### On Android Emulator

```bash
# Build and install debug APK on emulator
cd android-app
./gradlew installDebug

# Or install manually
adb install app/build/outputs/apk/debug/app-debug.apk
```

### On Physical Device

1. Enable Developer Mode on your Android device
2. Connect via USB with USB Debugging enabled
3. Run:

```bash
cd android-app
./gradlew installDebug
```

## Testing

### Unit Tests

```bash
cd android-app
./gradlew test
```

### Instrumented Tests (on device/emulator)

```bash
cd android-app
./gradlew connectedAndroidTest
```

### Manual Testing Checklist

- [ ] App launches and loads the website
- [ ] All images and assets load correctly
- [ ] Navigation works (links, back button)
- [ ] Forms work (login, checkout, search)
- [ ] Zoom controls function
- [ ] Camera/file upload works (if tested)
- [ ] Landscape and portrait orientations work
- [ ] App doesn't crash on back button from home page

## Deployment

### Google Play Store

1. Build release APK:
   ```bash
   ./gradlew bundleRelease
   ```

2. Sign the APK with your release keystore

3. Upload to Google Play Console

4. Configure app store listing with:
   - App icon
   - Screenshots (phone, tablet)
   - Description
   - Category: Shopping
   - Content rating

### Version Management

Update version in `app/build.gradle.kts`:

```kotlin
versionCode = 1          // Increment for each release
versionName = "1.0"      // User-facing version
```

## Troubleshooting

### App crashes on startup

- Check `AndroidManifest.xml` for correct permissions
- Verify `MainActivity` class name matches manifest
- Check `R.id.webview` matches layout file

### WebView shows blank page

- Verify `WEBSITE_URL` is correct
- Check internet connectivity
- Verify `INTERNET` permission is granted
- Check device network proxy settings

### Images/assets not loading

- Enable mixed content in WebSettings
- Check CORS headers on server
- Verify S3 bucket permissions
- Check CDN configuration

### JavaScript not working

- Ensure `javaScriptEnabled = true`
- Check browser console for errors
- Verify JavaScript in web app works in browser

### Performance issues

- Reduce cache size or disable caching
- Enable hardware acceleration
- Optimize web app for mobile
- Monitor memory usage with Android Profiler

## Future Enhancements

- [ ] Native bottom navigation for key sections
- [ ] Payment gateway integration (Razorpay, PayPal)
- [ ] Push notifications for orders
- [ ] Offline mode with cached content
- [ ] Native authentication with biometric login
- [ ] App shortcuts for quick access
- [ ] Widget for order status tracking
- [ ] Performance optimizations and caching strategies
- [ ] In-app reviews and ratings
- [ ] Crash reporting and analytics

## Contributing

To contribute improvements:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test thoroughly
3. Commit with clear messages
4. Push to origin and create a Pull Request

## Support

For issues or feature requests, please create an issue in the repository.

## License

This project is part of TheNileKart and follows the same license as the main repository.

## Resources

- [Android Developer Documentation](https://developer.android.com/docs)
- [WebView Best Practices](https://developer.android.com/develop/ui/views/layout/webapps/webview)
- [Kotlin Language Guide](https://kotlinlang.org/docs/)
- [Gradle Documentation](https://gradle.org/docs/)
