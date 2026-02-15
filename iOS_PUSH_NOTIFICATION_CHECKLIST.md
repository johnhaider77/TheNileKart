# iOS Push Notifications - Quick Action Checklist

## 🔴 Current Issue
- iOS device sending test token: `"exampleToken123"` (15 chars)
- Real tokens should be 150+ chars
- Push notifications failing because backend rejects invalid tokens

## ✅ What's Fixed (Backend Side)
- ✅ Better error messages telling you exactly what's wrong
- ✅ Auto-cleanup of invalid tokens
- ✅ CRITICAL-level alerts when all tokens are invalid
- ✅ Deployed to EC2 and live

## 🟡 What You Need to Do (iOS Side)

### Step 1: Verify GoogleService-Info.plist (2 min)
- [ ] Open `ios-app/TheNileKartApp.xcworkspace` in Xcode
- [ ] Left panel → Select root "TheNileKartApp" project
- [ ] Select "TheNileKartApp" target
- [ ] "Build Phases" tab
- [ ] Scroll down to "Copy Bundle Resources"
- [ ] Verify `GoogleService-Info.plist` is listed (if not, add it)

### Step 2: Check Firebase Framework (2 min)
- [ ] Select "TheNileKartApp" target
- [ ] "Build Phases" tab
- [ ] Scroll to "Link Binary With Libraries"
- [ ] Should see Firebase pods listed
- [ ] No "Swift Package Manager" entries (remove if found)

### Step 3: Request Notification Permissions (2 min)
Find the first screen that loads (likely AppDelegate.swift or SceneDelegate.swift)

Add this code:
```swift
import UserNotifications
import FirebaseMessaging

// In AppDelegate or first ViewController that loads
UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
    if granted {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
}
```

### Step 4: Handle FCM Token (2 min)
Find where you're handling Firebase setup (or create AppDelegate if needed)

Add this code:
```swift
import FirebaseMessaging

// In AppDelegate
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // First: Configure Firebase
    FirebaseApp.configure()
    
    // Second: Get FCM Token
    Messaging.messaging().token { token, error in
        if let token = token {
            print("✅ FCM Token: \(token)")
            print("   Length: \(token.count) chars")
            
            // Third: Send to backend
            self.registerTokenWithBackend(token)
        } else if let error = error {
            print("❌ Error getting FCM token: \(error)")
        }
    }
    
    return true
}

// Add this method to send token to backend
func registerTokenWithBackend(_ token: String) {
    // POST to /api/push-notifications/register-token
    // Include: { "deviceToken": token }
}
```

### Step 5: Clean Build (3 min)
In Xcode:
- [ ] Product → Clean Build Folder (Cmd + Shift + K)
- [ ] Wait for it to finish
- [ ] Product → Build (Cmd + B)
- [ ] Wait until "Build Succeeded"

### Step 6: Run on Device (2 min)
- [ ] Select your test device (iPhone) from top
- [ ] Product → Run (Cmd + R)
- [ ] When prompted: ALLOW notifications
- [ ] Check Xcode console for: "✅ FCM Token: ..." (should be 150+ chars)

### Step 7: Verify Backend Received Token (2 min)

**Option A - Using curl**:
```bash
curl https://thenilekart.com/api/push-notifications/diagnostic \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "userToken": "eIaM9dLYcU3dL2e8r2bNxK7vZ9pQ1sT4uV6wX8yZ0aBcDeF1gHiJ2kL3mN4oP5qR6s...",
  "isValid": true,
  "tokenLength": 152,
  "storedTokens": ["eIaM9dLYcU3dL2e8r2bNxK7vZ9pQ1sT4uV6wX8yZ0aBcDeF1gHiJ2kL3mN4oP5qR6s..."]
}
```

**Option B - Check app logs**:
- Open iOS app
- Perform any action that sends a request to backend
- In browser DevTools → Network → Find any request to thenilekart.com
- The request headers or body might show your JWT
- Check server logs on EC2 for token registration

### Step 8: Test Push Notification (2 min)

Once token is valid:

```bash
curl -X POST https://thenilekart.com/api/push-notifications/send-bulk \
  -H "Authorization: Bearer ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientUserIds": [YOUR_USER_ID],
    "heading": "Test Notification",
    "message": "Push notification test - if you see this, it works!",
    "actionType": "home",
    "actionData": {}
  }'
```

Expected response:
```json
{
  "success": true,
  "notificationsSent": true,
  "message": "Successfully sent notifications to 1 device(s)",
  "devicesSent": 1,
  "devicesFailed": 0
}
```

**If token is STILL invalid**, response will show:
```json
{
  "invalidTokensDetected": 1,
  "allTokensInvalid": true,
  "recommendation": "CRITICAL: All device tokens are invalid..."
}
```

This means token is still not being sent properly from iOS app - go back to Step 3-6.

## 🆘 Troubleshooting

### Issue: "Build failed - Firebase module not found"
**Solution**: 
- [ ] Product → Clean Build Folder
- [ ] Delete `ios-app/Pods` folder
- [ ] Delete `ios-app/Podfile.lock` file
- [ ] Run: `cd ios-app && pod install`
- [ ] Close Xcode
- [ ] Open `ios-app/TheNileKartApp.xcworkspace` (NOT .xcodeproj)

### Issue: "Still seeing 'exampleToken123' token"
**Solution**:
- [ ] Check Xcode console log - look for errors
- [ ] Verify UNUserNotificationCenter permission was granted
- [ ] Check: `Messaging.messaging().token` is being called
- [ ] Ensure Firebase configuration is complete (Step 4)

### Issue: "Token received but still no notifications"
**Solution**:
- [ ] Check App was in foreground when sending (iOS 15+ requires app to handle foreground notifications)
- [ ] Add `UNUserNotificationCenterDelegate` implementation
- [ ] Implement `userNotificationCenter(_:willPresent:withCompletionHandler:)`

### Issue: "Permission not being requested"
**Solution**:
- [ ] Move permission code to `didFinishLaunchingWithOptions`
- [ ] Ensure it's NOT in a conditional block
- [ ] Call on main thread: `DispatchQueue.main.async { ... }`
- [ ] Test on device (simulator sometimes doesn't show permission prompt)

## 📊 Progress Tracking

| Step | Task | Status | Time |
|------|------|--------|------|
| 1 | Verify GoogleService-Info.plist | ⬜ TODO | 2 min |
| 2 | Check Firebase Framework | ⬜ TODO | 2 min |
| 3 | Request Notification Permissions | ⬜ TODO | 2 min |
| 4 | Handle FCM Token | ⬜ TODO | 2 min |
| 5 | Clean Build | ⬜ TODO | 3 min |
| 6 | Run on Device | ⬜ TODO | 2 min |
| 7 | Verify Backend Received Token | ⬜ TODO | 2 min |
| 8 | Test Push Notification | ⬜ TODO | 2 min |

**Total Time**: ~17 minutes ⏱️

## 🎯 Success = 
Push notification arrives on iOS device with valid FCM token (150+ chars) 🚀

## 📝 Resources
- [Firebase iOS Setup Guide](https://firebase.google.com/docs/cloud-messaging/ios/client)
- [Apple UserNotifications Framework](https://developer.apple.com/documentation/usernotifications)
- [CocoaPods Documentation](https://cocoapods.org/)

---

**Once you complete all steps**, you can send push notifications and they will reach the device. The backend is now ready to handle them properly with excellent error messages if anything goes wrong! ✨
