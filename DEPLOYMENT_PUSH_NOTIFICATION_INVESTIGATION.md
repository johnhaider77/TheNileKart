# Push Notification Issue Investigation & Deployment

**Date**: 15 February 2026  
**Status**: ✅ DEPLOYED & LIVE  
**Backend Version**: v1.0.0 (PM2 PID: 953464)

---

## Issue Analysis

### HAR Log Findings

From the user's HAR log of push notification attempt:

```json
{
  "request": {
    "url": "https://thenilekart.com/api/push-notifications/send",
    "postData": {
      "recipientUserId": 10,
      "heading": "First Push Notification!",
      "message": "hfhgdf bvbvcyuy uyfjfbvn"
    }
  },
  "response": {
    "status": 200,
    "content": {
      "deviceTokensSample": "exampleToken123...",
      "tokenLengths": [{ "length": 15, "isValid": false }],
      "allTokensInvalid": true,
      "recommendation": "Verify iOS app has: 1) GoogleService-Info.plist, 2) Firebase initialized properly, 3) User granted notification permissions"
    }
  }
}
```

### Root Cause

**iOS device is sending test token instead of real FCM token:**

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Token Length | 150+ chars | 15 chars | ❌ Invalid |
| Token Type | Real FCM | `exampleToken123` | ❌ Test Token |
| Registration | Firebase SDK | Test Value | ❌ Not Real |
| Notification Delivery | ✅ Possible | ❌ Blocked | ❌ FAILED |

### Why Notifications Failed

1. **iOS app not using real Firebase token** - Sending `exampleToken123` (test placeholder)
2. **Backend correctly rejects it** - Token validation detects short tokens (< 100 chars)
3. **Firebase Cloud Messaging can't deliver** - Invalid token format rejected by FCM service

---

## Deployment Summary

### Frontend
- ✅ Built locally: 184.82 kB (gzipped)
- ✅ Synced to EC2: `/var/www/thenilekart/TheNileKart/frontend/build/`
- ✅ Nginx serving static assets

### Backend
- ✅ Dependencies installed: 504 packages audited
- ✅ Code synced to EC2: `/var/www/thenilekart/TheNileKart/backend/`
- ✅ PM2 restarted: Process ID 953464
- ✅ Backend online: Status verified

### Git
- ✅ Latest commit: `ae178cc` (Push notification documentation)
- ✅ All code up to date on main branch
- ✅ Excluded `.env*` and `.xcuserdata` from commit

### Timeline
```
09:27:19 - User sends test push notification request (with invalid token)
09:27:19 - Backend detects token is invalid (15 chars vs 150+ required)
09:27:19 - Backend returns 200 with error details + recommendations
09:29:13 - Frontend built locally (184.82 KB)
09:29:16 - Code synced to EC2 (329 KB transferred)
09:29:16 - Backend dependencies installed
09:29:16 - PM2 restarted (PID 953464)
09:29:26 - Backend fully operational, processing requests
```

---

## Current Response Structure

### Successful Case (when real token is used)
```json
{
  "success": true,
  "notificationsSent": true,
  "message": "Notification sent successfully to 1 device(s)",
  "notificationId": 28,
  "devicesSent": 1,
  "devicesFailed": 0,
  "totalDevices": 1,
  "details": {
    "messageId": "..."
  }
}
```

### Failed Case (with invalid token - Current Situation)
```json
{
  "success": true,
  "notificationsSent": false,
  "message": "Failed to send notification: All 1 device token(s) are invalid/short. iOS app must retrieve real FCM token from Firebase SDK.",
  "notificationId": 28,
  "devicesSent": 0,
  "devicesFailed": 1,
  "totalDevices": 1,
  "debugInfo": {
    "recipientId": 10,
    "deviceTokensRegistered": 1,
    "deviceTokensSample": "exampleToken123...",
    "tokenLengths": [{ "length": 15, "isValid": false }],
    "allTokensInvalid": true,
    "recommendation": "Verify iOS app has: 1) GoogleService-Info.plist, 2) Firebase initialized properly, 3) User granted notification permissions"
  }
}
```

---

## Backend Error Detection

### Available Endpoints

1. **POST /api/push-notifications/send** - Send to single user
   - Validates all tokens before attempting send
   - Returns clear error if tokens are invalid
   - Shows what went wrong + how to fix it

2. **POST /api/push-notifications/send-bulk** - Send to multiple users
   - Enhanced with token validity detection
   - Flags when ALL tokens are invalid (critical situation)
   - Provides actionable recommendations

3. **POST /api/push-notifications/register-token** - Register device token
   - Auto-rejects test/placeholder tokens with explanation
   - Auto-cleanup of old invalid tokens
   - Clear guidance if registration fails

4. **GET /api/push-notifications/check-token?token=...** - Debug endpoint
   - Analyze any token without sending notification
   - Shows token validity, length, test indicators
   - Great for troubleshooting

### Token Validation Logic

```javascript
// Token is valid if:
function isValidFCMToken(token) {
  if (!token || token.length < 100) return false;           // Too short
  if (/^[a-zA-Z0-9_-]+$/.test(token)) return true;          // Alphanumeric + dash/underscore
  return false;
}

// Test token detection
const testTokens = ['exampleToken123', 'test', 'demo', 'placeholder', 'example'];
const isTestToken = testTokens.some(t => token.toLowerCase().includes(t.toLowerCase()));
```

---

## What iOS App Needs to Do

### Immediate Actions (for User/Developer)

1. **Verify GoogleService-Info.plist**
   - Must be in Xcode project
   - Must be in Build Targets
   - Must be uploaded from Firebase Console

2. **Ensure Firebase SDK Initialization**
   ```swift
   import FirebaseCore
   import FirebaseMessaging
   
   // In AppDelegate.didFinishLaunchingWithOptions:
   FirebaseApp.configure()
   Messaging.messaging().isAutoInitEnabled = true
   ```

3. **Request Notification Permissions**
   ```swift
   UNUserNotificationCenter.current().requestAuthorization(
     options: [.alert, .sound, .badge]
   ) { granted, error in
       if granted {
           DispatchQueue.main.async {
               UIApplication.shared.registerForRemoteNotifications()
           }
       }
   }
   ```

4. **Handle FCM Token Properly**
   ```swift
   Messaging.messaging().token { token, error in
       if let token = token {
           print("FCM Token: \(token)")  // Should be 150+ characters
           // Send this token to backend
       }
   }
   ```

5. **Clean Build & Reinstall**
   - Product → Clean Build Folder (Cmd+Shift+K)
   - Product → Build (Cmd+B)
   - Product → Run (Cmd+R)
   - Grant notification permissions when prompted

---

## Testing

### Test 1: Check if endpoint rejects invalid tokens
```bash
curl -X POST "https://thenilekart.com/api/push-notifications/send" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientUserId": 10,
    "heading": "Test",
    "message": "Test message",
    "actionType": "home",
    "actionData": {}
  }'
```

**Expected Result:** 
- Status: 200
- `notificationsSent`: false
- Message: "All tokens are invalid/short"
- `recommendation`: "Verify iOS app has GoogleService-Info.plist..."

### Test 2: Use token checking endpoint
```bash
curl "https://thenilekart.com/api/push-notifications/check-token?token=exampleToken123"
```

**Expected Result:**
```json
{
  "tokenLength": 15,
  "isValid": false,
  "isTestToken": true,
  "details": "🚫 THIS IS A TEST TOKEN - WILL NOT WORK!"
}
```

### Test 3: After iOS fix, token will be valid
```bash
curl "https://thenilekart.com/api/push-notifications/check-token?token=eIaM9dLYcU3dL2e8r2bNxK7vZ9pQ1sT4uV6wX8yZ0aBcDeF1gHiJ2kL3mN4oP5qR6s..."
```

**Expected Result:**
```json
{
  "tokenLength": 152,
  "isValid": true,
  "isTestToken": false,
  "details": "✅ This looks like a valid FCM token"
}
```

---

## Logs Verification

Backend is correctly logging the issue:

```
❌ INVALID DEVICE TOKEN DETECTED
Token: exampleToken123
Length: 15
Real FCM tokens are ~150+ characters, alphanumeric.
This appears to be a test/example token that will NOT receive notifications.
❌ Error sending push notification: Invalid device token format. Expected real FCM token (150+ chars), got: exampleToken123...
```

---

## Summary of System State

| Component | Status | Details |
|-----------|--------|---------|
| Frontend Build | ✅ OK | 184.82 KB, up to date |
| Backend Process | ✅ OK | PM2 PID 953464, online |
| Database | ✅ OK | Connected, processing queries |
| Firebase Integration | ✅ OK | Service ready, rejecting invalid tokens |
| iOS App | ❌ ACTION NEEDED | Sending test tokens, must be rebuilt |
| Push Notifications | ⏸️ BLOCKED | Waiting for iOS app to send real tokens |

---

## Next Steps

1. **iOS Developer Action** (CRITICAL)
   - Follow the iOS checklist above
   - Rebuild app with proper Firebase configuration
   - Grant notification permissions when prompted
   - Test token should now be 150+ characters

2. **Verification**
   - Check app generates valid FCM token in logs
   - Token should be auto-registered to backend
   - Run diagnostic endpoint: `GET /api/push-notifications/diagnostic`
   - Token should show `"isValid": true` and `"tokenLength": 150+`

3. **Production Test**
   - Send test push notification from seller portal
   - Notification should arrive on iOS device
   - Check backend logs for `✅ Successfully sent` message

---

## Files Deployed

### On EC2 (40.172.190.250)
- `/home/ubuntu/var/www/thenilekart/TheNileKart/backend/routes/push-notifications.js` ✅
- `/home/ubuntu/var/www/thenilekart/TheNileKart/backend/services/pushNotificationService.js` ✅
- `/home/ubuntu/var/www/thenilekart/TheNileKart/frontend/build/*` ✅

### In Git Repository
- Latest commit: `ae178cc`
- Branch: `main`
- All documentation files updated

---

## Support

### Debugging Commands

**Check if endpoint is responding:**
```bash
curl -s https://thenilekart.com/api/push-notifications/check-token?token=test
```

**Check backend logs:**
```bash
ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250 "pm2 logs thenilekart-backend --lines 50"
```

**Verify PM2 status:**
```bash
ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250 "pm2 status"
```

**Restart backend if needed:**
```bash
ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250 "pm2 restart thenilekart-backend"
```

---

**Status**: Ready for iOS app rebuild and testing ✅
