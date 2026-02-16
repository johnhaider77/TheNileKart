# Push Notification Test Token Issue - Diagnostic Report & Fix

**Date:** February 16, 2026  
**Status:** ⚠️ ISSUE CONFIRMED - Device still has test token  
**Root Cause:** iOS device has not received latest app build with real FCM token logic

---

## Issue Summary

### Current State
- **Device Token Stored:** `exampleToken123` (15 characters)
- **Expected Token:** Real Firebase FCM token (150+ characters)
- **Backend Response:** ❌ Correctly rejecting invalid token
- **Backend Status:** ✅ Working correctly (not the problem)

### Backend Logs (Latest)
```
0|thenilek | 2026-02-16 05:04:53 +00:00: ❌ INVALID DEVICE TOKEN DETECTED
0|thenilek | 2026-02-16 05:04:53 +00:00: Token: exampleToken123
0|thenilek | 2026-02-16 05:04:53 +00:00: Length: 15
0|thenilek | 2026-02-16 05:04:53 +00:00: Real FCM tokens are ~150+ characters, alphanumeric.
0|thenilek | 2026-02-16 05:04:53 +00:00: This appears to be a test/example token that will NOT receive notifications.
```

---

## Diagnostic Results

### ✅ What's Working
1. **Backend Code:** Latest version deployed to EC2 ✓
2. **Token Validation:** Correctly detecting invalid tokens ✓
3. **Firebase Integration:** Server-side ready ✓
4. **API Endpoints:** Responding correctly ✓
5. **iOS App Source Code:** Correctly configured for real FCM token retrieval ✓

### ❌ What's Not Working
1. **Physical Device:** Still running old app build (or has cached test token)
2. **Device Token:** Not updated from test token to real FCM token
3. **User Device ID 10:** Registered with invalid token in database

---

## Root Cause Analysis

The iOS app source code (`ios-app/TheNileKartApp/TheNileKartApp.swift`) is **already correctly configured** to:
- Retrieve real Firebase tokens via `Messaging.messaging().token`
- Register tokens with backend at `/api/push-notifications/register-token`
- Handle token refresh events

**However:** The physical device still has the old test token because:
1. ❌ Device hasn't received the latest app build yet
2. ❌ Old cached token still stored in UserDefaults
3. ❌ Database still has old test token registered

---

## Solution: 3-Step Fix

### Step 1: Build & Deploy Latest iOS App to Physical Device

```bash
cd /Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/ios-app

# Clean build
xcodebuild -workspace TheNileKartApp.xcworkspace \
  -scheme TheNileKartApp \
  -configuration Release \
  -derivedDataPath DerivedData \
  clean

# Full build for device
xcodebuild -workspace TheNileKartApp.xcworkspace \
  -scheme TheNileKartApp \
  -configuration Release \
  -destination 'platform=iOS,id=00008150-0016554E3412401C'
```

### Step 2: Install & Run on Device

1. Connect iPhone to Mac via USB
2. Click "Run" in Xcode (or use command above)
3. App will rebuild and deploy to device
4. Grant notification permissions when prompted

### Step 3: Verify Real Token Registration

**In Xcode Console, look for:**
```
✅ FCM Token retrieved successfully!
🔐 Token: [150+ character string]
📏 Token length: 152 characters
✅ Token registered with backend!
```

---

## Verification Steps

### On Physical Device:
1. **Open App** → Should show real FCM token in console (150+ chars)
2. **Grant Permissions** → When prompted, tap "Allow" for notifications
3. **Wait 2-3 seconds** → Backend should log token registration

### On Backend (EC2):
```bash
ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250 \
  "pm2 logs thenilekart-backend --lines 20 --nostream"
```

**Look for:**
```
✅ Token registered with backend!
✅ Real FCM token saved
Token length: 152 (Valid!)
```

### Test Push Notification:
1. Go to seller dashboard
2. Send test notification to user ID 10
3. **Should arrive on iOS device within 1-3 seconds**
4. Verify it's displayed in notification center

---

## Expected Behavior After Fix

### Before (Current - Broken) ❌
```json
{
  "success": true,
  "notificationsSent": false,
  "message": "Failed to send notification: All 1 device token(s) are invalid/short",
  "devicesSent": 0,
  "devicesFailed": 1,
  "tokenLengths": [{"length": 15, "isValid": false}]
}
```

### After (Fixed - Working) ✅
```json
{
  "success": true,
  "notificationsSent": true,
  "message": "Notification sent successfully to 1 device(s)",
  "devicesSent": 1,
  "devicesFailed": 0,
  "tokenLengths": [{"length": 152, "isValid": true}]
}
```

---

## Checklist for iOS App Deployment

- [ ] Latest code pulled (commit: 36e21e4 or later)
- [ ] Xcode opened with TheNileKartApp.xcworkspace
- [ ] iPhone connected via USB
- [ ] Build configuration set to Release
- [ ] Clean build folder executed
- [ ] Fresh build deployed to device
- [ ] App launched on device
- [ ] Notification permission granted
- [ ] Xcode console shows "✅ FCM Token retrieved successfully!"
- [ ] Token length shows 150+ characters
- [ ] Token registered message appears

---

## Why This Works

1. **iOS App Code is Correct:** Already retrieves real Firebase tokens
2. **Backend Code is Correct:** Properly validates and registers tokens
3. **Firebase is Configured:** GoogleService-Info.plist is in place
4. **Database Ready:** Will store real token when app sends it

The **only missing piece:** Getting the latest app build with working code onto the physical device.

---

## Network Requirements for Device

- iPhone must have:
  - ✅ Internet connection (WiFi or cellular)
  - ✅ Notification permissions enabled in iOS Settings
  - ✅ App in foreground (or background with permissions)
  - ✅ Location: Can be anywhere (notifications are cloud-based)

---

## Troubleshooting

### "Permission dialog never appears"
- **Solution:** Go to Settings → TheNileKart → enable Notifications

### "Token shows as 15 characters (exampleToken123)"
- **Solution:** 
  1. Force quit app (swipe up)
  2. Delete app from device
  3. Rebuild and redeploy from Xcode
  4. Grant permissions when prompted

### "Token shows 150+ but notification still doesn't arrive"
- **Solution:**
  1. Check iPhone is not in Do Not Disturb
  2. Check notification settings in iOS Settings
  3. Verify backend Firebase configuration
  4. Check PM2 logs on EC2: `pm2 logs thenilekart-backend`

### "Build fails with sandbox error"
- **Solution:** Use sandbox workaround in `Pods-TheNileKartApp-resources.sh`
  - Already applied in this repo
  - Build should complete without errors

---

## Files & Configurations

### iOS App
- **Main File:** [ios-app/TheNileKartApp/TheNileKartApp.swift](../ios-app/TheNileKartApp/TheNileKartApp.swift#L240-L280)
- **Config:** `ios-app/TheNileKartApp/GoogleService-Info.plist`
- **Status:** ✅ All correct, ready for deployment

### Backend
- **API Endpoint:** `POST /api/push-notifications/register-token`
- **Validation:** `backend/services/pushNotificationService.js`
- **Routes:** `backend/routes/push-notifications.js`
- **Status:** ✅ All correct, running on EC2

### Database
- **Token Storage:** `user_devices` table
- **Columns:** `user_id`, `device_token`, `fcm_token`, `created_at`
- **Status:** ✅ Ready to store real tokens

---

## Next Steps (Action Items)

1. **Rebuild iOS App**
   - Clean build
   - Deploy to physical device
   - Verify token retrieval in console

2. **Monitor Backend**
   - Check logs for token registration
   - Verify database update

3. **Test End-to-End**
   - Send notification from dashboard
   - Confirm arrival on device

4. **Document Success**
   - Note token length
   - Confirm notification delivery time
   - Update this guide with results

---

## Summary

| Component | Status | Issue |
|-----------|--------|-------|
| iOS App Source Code | ✅ Ready | None - code is correct |
| Backend Server | ✅ Online | None - server working correctly |
| Firebase Config | ✅ Ready | None - configured properly |
| Physical Device Build | ❌ Outdated | Has old app with test token |
| Device Token in DB | ❌ Invalid | Still `exampleToken123` (15 chars) |
| **Solution** | **🔧 Rebuild** | **Deploy latest app to device** |

---

**Key Insight:** The system is working as designed. The backend is correctly detecting and rejecting the test token. The iOS app code is correct. The **only issue is that the physical device hasn't received the updated app build yet.**

Once you rebuild and redeploy the app to the device, it will automatically:
1. Retrieve real Firebase token from Firebase SDK
2. Register token with backend
3. Start receiving push notifications

This should take **5-10 minutes total** to deploy and verify.
