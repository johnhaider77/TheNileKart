# How to Test Header Logo Visibility on Physical Android Device

## Quick Start Guide

### Step 1: Connect Your Android Device
```bash
# Plug in Samsung phone via USB cable
# Enable USB Debugging on device:
#   Settings → Developer Options → USB Debugging (toggle ON)
#   If "Developer Options" not visible: Settings → About Phone → 
#   Tap "Build Number" 7 times → Back to Settings

# Verify connection
adb devices
# Expected output: [device-serial]  device
```

### Step 2: Install the App
```bash
cd /Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart

# Install the debug APK
adb install -r android-app/app/build/outputs/apk/debug/app-debug.apk
```

### Step 3: Manual Verification (5 seconds)
1. **Open the app** - Tap "TheNileKart" icon on your phone
2. **Wait for load** - Give it 5-10 seconds for WebView to load
3. **Look at the header** - At the top of the screen
4. **Check for "TheNileKart" text** - Should be visible in the header area

**Result:**
- ✅ **If you see "TheNileKart" text at the top** → `.header-logo-text` is VISIBLE
- ❌ **If you don't see it** → There's a CSS/display issue

### Step 4: Automated Testing (Optional)
```bash
# Install test APK
adb install android-app/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk

# Run automated tests
adb shell am instrument -w com.example.thenilekart.test/androidx.test.runner.AndroidJUnitRunner

# Wait for results to appear in terminal
```

## What You Should See

### Screenshot Expectation
```
┌─────────────────────────────┐
│  🛍️ TheNileKart            │  ← header-logo-text (SHOULD BE VISIBLE)
├─────────────────────────────┤
│ Home  Products  Categories  │
│ ...content...               │
└─────────────────────────────┘
```

### Expected Behavior
- Logo text should appear in top-left or center of navbar
- Text should say exactly "TheNileKart"
- Should be black/dark text (readable on light background)
- Should NOT be:
  - Hidden
  - Greyed out
  - Transparent/invisible
  - Cut off at edge

## If Test Fails

### Logo Not Visible
1. Check if page loaded - Do you see other content?
2. Try scrolling to top
3. Force close app: `adb shell am force-stop com.example.thenilekart`
4. Reopen app and wait longer

### App Crashes on Launch
```bash
# Check logs
adb logcat | grep -i thenilekart

# Clear app cache
adb shell pm clear com.example.thenilekart

# Reinstall
adb uninstall com.example.thenilekart
adb install android-app/app/build/outputs/apk/debug/app-debug.apk
```

### WebView Shows Blank Screen
```bash
# Check backend connection
adb logcat | grep "40.172.190.250"

# Verify backend is running locally
# Or connect to 40.172.190.250 backend on port 5000
```

## Test Report Template

Save this when testing:

```
Test Date: [Today's date]
Device: Samsung [Model]
Android Version: [e.g., 12, 13, 14]

Header Logo Text (.header-logo-text) Visibility Test
====================================================

Test 1: Visual Inspection
□ PASS - "TheNileKart" text visible in header
□ FAIL - Text not visible
□ FAIL - Text partially visible
□ FAIL - App crashed

Test 2: Element Properties
□ PASS - Text is readable
□ PASS - Text is not cut off
□ PASS - Text color is appropriate
□ FAIL - Text is too faint
□ FAIL - Text is hidden behind other elements

Test 3: Automated Test (if run)
□ PASS - testWebViewIsDisplayed ✓
□ PASS - testWebViewLoadsSuccessfully ✓
□ FAIL - Tests failed (see console output)

Overall Status: PASS / FAIL

Notes:
[Any observations or issues]
```

## Reference Files

- **Main APK:** `android-app/app/build/outputs/apk/debug/app-debug.apk` (6.0 MB)
- **Test APK:** `android-app/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`
- **Navbar Code:** `frontend/src/components/Navbar.tsx` (contains `.header-logo-text`)
- **CSS Styling:** `frontend/src/styles/global.css` (contains `.header-logo-text` styles)

## Support

If you need help with testing:

1. **Check device logs:**
   ```bash
   adb logcat | tail -100
   ```

2. **Check browser console (via USB debugging):**
   ```bash
   # Can use Chrome Developer Tools to inspect WebView content
   ```

3. **Verify network connectivity:**
   ```bash
   # From device terminal app or ADB
   ping -c 1 40.172.190.250
   ```

---

**Report your findings:** Let me know if the header logo text is visible after testing!
