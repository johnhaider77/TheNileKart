# iPhone App Installation - Troubleshooting & Manual Steps

**Date:** February 16, 2026  
**Issue:** App built successfully but not visible on device  
**Device ID:** 00008150-0016554E3412401C

---

## Quick Checklist

✅ **App Build:** SUCCEEDED  
✅ **App Bundle:** Found in Xcode DerivedData  
❓ **Device Connection:** Needs verification  
❓ **App Visibility:** Not confirmed on device  

---

## Manual Steps to Install & Run App

### **Method 1: Using Xcode GUI (Recommended)**

1. **Connect iPhone** via USB to Mac
   - Keep cable connected throughout this process
   - You should see device name in Xcode top bar

2. **Open Xcode Project**
   ```bash
   cd /Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/ios-app
   open TheNileKartApp.xcworkspace
   ```

3. **Select Your Device**
   - Top left of Xcode, next to Play button
   - Should show: `TheNileKartApp > [Your iPhone Name]`
   - If you don't see your device:
     - a) Unplug iPhone
     - b) Plug back in
     - c) iPhone will ask "Trust this computer?" → Tap **TRUST**
     - d) Wait 5 seconds
     - e) Your device should appear in the list

4. **Run the App**
   - Press `Cmd + R` (or click Play button)
   - Xcode will:
     - Build the app
     - Install it on device
     - Launch it automatically
     - Show console logs in bottom panel

5. **Grant Notification Permission**
   - App opens on phone
   - iOS will prompt: "Allow notifications?"
   - Tap **ALLOW**

6. **Monitor Xcode Console**
   - Look for messages like:
   ```
   ✅ FCM Token retrieved successfully!
   🔐 Token: [150+ chars]
   📏 Token length: 152 characters
   ✅ Token registered with backend!
   ```

---

### **Method 2: Command Line with ios-deploy**

If you want to use terminal:

```bash
# Install ios-deploy if not available
brew install ios-deploy

# Navigate to app bundle
cd ~/Library/Developer/Xcode/DerivedData/TheNileKartApp-edvgsygedzfbqtgfoapfjmcwkjoa/Build/Products/Release-iphoneos

# Install and run
ios-deploy --bundle TheNileKartApp.app --id 00008150-0016554E3412401C --justlaunch
```

---

## If Device Still Doesn't Show

### **Step 1: Verify Physical Connection**
```bash
# Check if device is connected
system_profiler SPUSBDataType | grep -A 5 "iPhone"
```

If device doesn't appear:
- Try different USB cable
- Try different USB port
- Restart Mac
- Restart iPhone

### **Step 2: Reset Trust Settings**

On iPhone:
1. Go to **Settings** → **General** → **Transfer or Reset**
2. Tap **Reset**
3. Tap **Reset Location & Privacy**
4. Reconnect to Mac

### **Step 3: Unpair and Re-pair**

```bash
# List paired devices
sudo defaults read /var/db/lockdown | grep -i "device"

# Or in Xcode: Window → Devices and Simulators → Remove device
# Then reconnect iPhone
```

---

## Firebase Token Retrieval - What Should Happen

Once app is running on phone and notification permission is granted:

**In Xcode Console (bottom panel), you should see:**

```
🚀 App launching...
✅ Firebase configured
✅ Push Notification Manager initialized
🔧 Setting up push notifications (Firebase optional)...
✅ User granted notification permission
📤 Fetching FCM token from Firebase...
✅ Firebase Messaging instance accessed
✅ FCM Token retrieved successfully!
🔐 Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjksImlhdCI6MTc3MTIxNDI... [VERY LONG STRING]
📏 Token length: 152 characters
📤 Sending token to backend...
✅ Token registered with backend!
```

---

## Backend Verification

Once token is retrieved, check backend received it:

```bash
ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250 \
  "pm2 logs thenilekart-backend --lines 50 --nostream 2>&1 | grep -i 'token\|fcm' | tail -10"
```

**Should show:**
```
✅ Real FCM token saved
Token length: 152 (Valid!)
Device registered successfully
User ID: 10
```

---

## Test Push Notification

Once backend confirms token is stored:

1. Go to: https://thenilekart.com/seller/send-notifications
2. Select recipient: User (make sure it's the user on this device)
3. Enter message: "Test notification"
4. Click **Send**

**Expected result:** Notification appears on iPhone within 1-3 seconds

---

## Troubleshooting Device Trust

If you see error: `"The requested device could not be found"`

**On iPhone:**
1. Settings → General → About
2. Look for "Trust" section
3. If it shows "Don't Trust", tap it
4. Tap **Trust** in popup

**On Mac:**
```bash
# Kill Xcode related services
killall -9 usbmuxd
killall -9 lockdownd

# Wait 5 seconds, then reconnect device
```

---

## Alternative: Use Simulator Instead

If device troubleshooting takes too long, use iOS Simulator:

```bash
cd /Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/ios-app
open TheNileKartApp.xcworkspace

# In Xcode:
# 1. Top left: Select "iPhone 15 Pro" (or any simulator)
# 2. Press Cmd + R to run

# Simulator will launch in window on Mac
# All same Firebase token retrieval will happen
```

---

## Expected Timeline

- Connect device: 30 seconds
- Build & install: 2-3 minutes
- App launch: 10 seconds
- Token retrieval: 5-10 seconds
- **Total:** 3-5 minutes

---

## Summary

| Step | Status | Action |
|------|--------|--------|
| 1. App Built | ✅ | Already done |
| 2. App Bundle Exists | ✅ | Verified in DerivedData |
| 3. Device Connected | ❓ | Verify with Method 1 |
| 4. Device Trusted | ❓ | Tap Trust on device |
| 5. App Installed | ⏳ | Use Xcode GUI Run button |
| 6. App Launched | ⏳ | Will happen after install |
| 7. Permission Granted | ⏳ | Tap Allow on phone |
| 8. Token Retrieved | ⏳ | Watch Xcode console |
| 9. Backend Receives Token | ⏳ | Check SSH backend logs |
| 10. Test Push Notification | ⏳ | Send from dashboard |

---

## Next Steps

1. **Connect iPhone with USB** (keep connected)
2. **Open Xcode GUI** with the project
3. **Select your device** from the dropdown
4. **Press Cmd + R** to Run

Report back with:
- ✅ or ❌ Device appears in Xcode dropdown
- ✅ or ❌ App installed on phone
- Messages from Xcode console (copy/paste)
- Backend log output

I'll help debug from there!
