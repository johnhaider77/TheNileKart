# Push Notification Debugging Guide

## Current Issue
Notifications are failing with: `"notificationsSent":false,"message":"Failed to send notification: 1 device(s) failed"`

## Root Cause
Device tokens stored in the database appear to be **placeholder/test tokens** (like `"exampleToken123..."`) instead of real FCM tokens (150+ characters).

### Why This Happens
1. **iOS app fails to get real FCM token** due to:
   - Missing or misconfigured `GoogleService-Info.plist`
   - Firebase not initialized properly
   - User not granting notification permissions
   
2. **App sends placeholder/test token to backend** instead of real token

3. **Backend stores invalid token** (now validates better, but still stored previously)

## How to Debug

### Step 1: Check Your Token Status

**For iOS device user (ID 10):**
```bash
curl -X GET "https://thenilekart.com/api/push-notifications/diagnostic" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response will show:**
- Token length (should be 150+ characters for real tokens)
- Whether tokens are valid
- Firebase configuration status

### Step 2: Identify Invalid Tokens

Response example:
```json
{
  "success": true,
  "deviceTokens": {
    "count": 1,
    "tokens": [
      {
        "index": 1,
        "token": "exampleToken123...",
        "length": 15,
        "isValid": "⚠️ Invalid - too short or test token",
        "isTestToken": "🚫 THIS IS A TEST TOKEN - WILL NOT WORK!"
      }
    ]
  }
}
```

**Problem:** Token is only 15 characters and labeled as test token!

### Step 3: Clean Invalid Tokens from Database

Once iOS app is fixed to send real tokens, clean out old test tokens:

```bash
curl -X DELETE "https://thenilekart.com/api/push-notifications/clean-tokens" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Removed 1 invalid token(s)",
  "invalidTokensRemoved": 1,
  "validTokensRemaining": 0,
  "removedTokens": [
    {
      "token": "exampleToken123...",
      "reason": "Too short (test/placeholder token)"
    }
  ]
}
```

## Fix for iOS App

### 1. Verify GoogleService-Info.plist is Present

```bash
# In ios-app directory
ls -la TheNileKartApp/GoogleService-Info.plist
```

Should show the Firebase config file is present.

### 2. Ensure Firebase is Initialized

In `ios-app/TheNileKartApp/TheNileKartApp.swift`:

```swift
@main
struct TheNileKartApp: App {
    init() {
        // MUST initialize Firebase on app launch
        FirebaseApp.configure()
        Messaging.messaging().delegate = PushNotificationManager.shared
    }
}
```

### 3. Get Real FCM Token

In `PushNotificationManager.swift`:

```swift
private func retrieveFCMToken() {
    Messaging.messaging().token { [weak self] token, error in
        if let error = error {
            print("❌ Error getting FCM token: \(error.localizedDescription)")
            return
        }
        
        guard let token = token else {
            print("❌ FCM token is nil")
            return
        }
        
        // Real FCM token will be 150+ characters
        print("✅ FCM Token retrieved: \(token.prefix(50))...")
        print("📏 Token length: \(token.count) characters") // Should be ~150+
        
        // Send to backend
        self?.sendTokenToBackend(token)
    }
}
```

### 4. Test the Flow

1. **Rebuild iOS app** with proper Firebase setup
2. **Launch on device**
3. **Grant notification permissions** when prompted
4. **Verify token in logs** - should be 150+ characters
5. **Token auto-sent to backend**
6. **Run diagnostic** to verify real token is stored
7. **Send notification** - should now work!

## Manual Testing Sequence

### Phase 1: Verify iOS Generates Real Token
```bash
# Watch iOS device logs for:
# "✅ FCM Token retrieved: cGTuqLJ7S_c2dXt9n4k_m5L_p8..."
# "📏 Token length: 176 characters"
```

### Phase 2: Verify Token Registered on Backend
```bash
curl -X GET "https://thenilekart.com/api/push-notifications/diagnostic" \
  -H "Authorization: Bearer USER_JWT_TOKEN"

# Should show:
# "length": 176,
# "isValid": "✅ Likely valid (150+ chars)"
```

### Phase 3: Send Test Notification
```bash
curl -X POST "https://thenilekart.com/api/push-notifications/send" \
  -H "Authorization: Bearer SELLER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientUserId": 10,
    "heading": "Test Notification",
    "message": "If you see this, push notifications work!",
    "actionType": "home",
    "actionData": {}
  }'

# Response should show:
# "success": true,
# "notificationsSent": true,
# "devicesSent": 1
```

### Phase 4: Verify on Device
Notification should appear on iOS device within 1-2 seconds.

## API Endpoints for Debugging

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/push-notifications/diagnostic` | GET | Check current token status | Required |
| `/api/push-notifications/clean-tokens` | DELETE | Remove invalid tokens | Required |
| `/api/push-notifications/check-token` | GET | Validate token format (debug) | None |
| `/api/push-notifications/send` | POST | Send notification | Required (Seller) |

## Common Issues & Solutions

### Issue: "exampleToken123" in Database
**Solution:** Run the clean-tokens endpoint to remove, then rebuild iOS app to get real token

### Issue: Token length less than 100 characters
**Solution:** iOS app isn't calling Firebase Messaging.token() properly. Check:
1. GoogleService-Info.plist exists
2. Firebase initialized: `FirebaseApp.configure()`
3. User granted permissions: `UNUserNotificationCenter`

### Issue: Notification still fails after cleaning tokens
**Solution:** 
1. Verify iOS device has network connection
2. Check backend has FIREBASE_SERVICE_ACCOUNT_KEY configured
3. Verify recipient user ID is correct
4. Check sender is authenticated as seller

## Backend Logs

To see detailed token registration:
```bash
# On EC2
pm2 logs thenilekart-backend | grep -i "token\|fcm\|notification"
```

Look for messages like:
```
✅ Registered valid FCM token for user 10. Total tokens: 1
❌ INVALID DEVICE TOKEN DETECTED
🚫 THIS IS A TEST TOKEN
```

## Important Notes

- **Real FCM tokens** are ~150+ characters, containing `_`, `-`, and alphanumeric chars
- **Test tokens** like `"exampleToken123"` will **NEVER** receive notifications
- **Token registration** automatically rejects test tokens with error message
- **Token cleanup** removes stored invalid tokens to allow fresh registration
- **Firebase service account key** must be configured on backend for any notifications to work

## Next Steps

1. ✅ Verify GoogleService-Info.plist is in iOS app
2. ✅ Rebuild and run iOS app
3. ✅ Grant notification permissions
4. ✅ Check diagnostic endpoint shows real token (150+ chars)
5. ✅ Run clean-tokens to remove old test tokens
6. ✅ Send test notification
7. ✅ Verify notification appears on device

---
**Last Updated:** February 15, 2026
**Status:** Push notification system is operational, waiting for real FCM token from iOS device
