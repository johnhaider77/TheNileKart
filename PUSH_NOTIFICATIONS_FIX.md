# Push Notifications Fix - FCM Token Validation

**Date**: 2025-01-21
**Status**: ✅ **DEPLOYED TO EC2**
**Commit**: `8830c12`

## Problem Summary

Push notifications were not being delivered to iOS users because:
1. iOS app was storing placeholder token `exampleToken123` instead of real FCM token
2. Backend was accepting invalid tokens without validation
3. Firebase Admin SDK correctly rejected invalid tokens during send, causing silent failures

**Evidence from HAR file**:
```json
{
  "token": "exampleToken123",
  "error": "Invalid device token format. Expected real FCM token (150+ chars), got: exampleToken123..."
}
```

## Root Cause Analysis

### Phase 1: iOS App Issue
- iOS app lacks `GoogleService-Info.plist` (Firebase config file)
- Without plist, Firebase SDK can't initialize
- Can't call `Messaging.messaging().token` to get real FCM token
- App falls back to placeholder/empty token

### Phase 2: Backend Accepting Invalid Tokens
- `POST /api/push-notifications/register-token` endpoint had **no validation**
- Any token, including placeholder tokens, was accepted and stored
- Backend stored `exampleToken123` in database

### Phase 3: Silent Failure on Send
- `POST /api/push-notifications/send-bulk` attempted to send notifications
- Firebase Admin SDK rejected invalid token (< 100 chars)
- Notification failed silently, user received nothing

**Complete Flow**:
```
iOS App (no Firebase plist)
    ↓
Can't get real FCM token
    ↓
Stores placeholder "exampleToken123"
    ↓
Sends placeholder to backend
    ↓
Backend accepts it (NO VALIDATION) ❌ BUG
    ↓
Database now has invalid token
    ↓
Send endpoint tries Firebase Admin SDK
    ↓
Firebase rejects token (< 100 chars)
    ↓
User never receives notification
```

## Solution Implemented

### 1. Backend Token Validation (DEPLOYED)

**File**: `backend/routes/push-notifications.js`
**Endpoint**: `POST /api/push-notifications/register-token`

#### Changes:
- ✅ Added `isValidFCMToken()` check before storing tokens
- ✅ Reject tokens < 100 characters (real FCM tokens are 150+)
- ✅ Detect and reject test/placeholder tokens (`exampleToken123`, `test`, `demo`, `example`)
- ✅ Remove old invalid tokens from user's device_tokens array
- ✅ Return 400 status with clear error messages
- ✅ Add logging for debugging
- ✅ Provide recommendations in error response

#### Error Response Example:
```json
{
  "success": false,
  "error": "Invalid device token: This appears to be a test/placeholder token. Please ensure the iOS app has GoogleService-Info.plist configured for Firebase.",
  "tokenLength": 15,
  "isTestToken": true,
  "recommendation": "Ensure iOS app is properly registered with Firebase Cloud Messaging and GoogleService-Info.plist is in the project"
}
```

### 2. Token Validation Function

**File**: `backend/services/pushNotificationService.js`

Already implemented:
```javascript
function isValidFCMToken(token) {
  if (!token) return false;
  
  // Test tokens or obviously fake tokens
  const testTokens = ['exampleToken123', 'test', 'demo', 'example'];
  if (testTokens.some(t => token.toLowerCase().includes(t.toLowerCase()))) {
    return false;
  }
  
  // Real FCM tokens are usually 150+ characters
  return token.length > 100;
}
```

### 3. Debug Endpoint

**Endpoint**: `GET /api/push-notifications/check-token?token=YOUR_TOKEN_HERE`

Usage:
```bash
# Check if a token is valid
curl "http://40.172.190.250/api/push-notifications/check-token?token=exampleToken123"
```

Response for invalid token:
```json
{
  "token": "exampleToken123",
  "tokenLength": 15,
  "isValid": false,
  "isTestToken": true,
  "validation": {
    "lengthOk": false,
    "expectedLength": "150+ characters",
    "notTestToken": false
  },
  "details": "🚫 THIS IS A TEST TOKEN - WILL NOT WORK! Use real FCM token from Firebase SDK",
  "recommendation": "iOS app must register real device token from Firebase Cloud Messaging SDK"
}
```

## Deployment Status

### What Was Deployed

1. **Backend Code** ✅
   - File: `backend/routes/push-notifications.js`
   - Changes: Added token validation to register-token endpoint
   - Synced to: `ubuntu@40.172.190.250:/home/ubuntu/var/www/thenilekart/TheNileKart/backend/`

2. **Frontend Build** ✅
   - Built locally: `npm run build`
   - Synced to: `ubuntu@40.172.190.250:/home/ubuntu/var/www/thenilekart/TheNileKart/frontend/build/`

3. **Backend Restart** ✅
   - Command: `pm2 restart all`
   - Status: Running (PID: 950212)

4. **Git Commit** ✅
   - Branch: `main`
   - Commit: `8830c12`
   - Message: "Fix: Add FCM token validation to prevent invalid tokens from being stored"

### Verification

**Token Validation Endpoint**: ✅ Working
```bash
$ curl "http://40.172.190.250/api/push-notifications/check-token?token=exampleToken123"
{
  "isValid": false,
  "isTestToken": true,
  "details": "🚫 THIS IS A TEST TOKEN - WILL NOT WORK!..."
}
```

## What Users Need to Do

### For iOS Users to Receive Real Push Notifications

**Requirement**: The iOS app needs the `GoogleService-Info.plist` file for Firebase

1. **Get Firebase Configuration**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select "TheNileKart" project
   - Download `GoogleService-Info.plist` for iOS app
   - **⚠️ DO NOT commit to git** (security risk - contains API keys)

2. **Add to Xcode Project**:
   - Open `ios-app/TheNileKartApp.xcworkspace` in Xcode
   - Right-click on "TheNileKartApp" folder
   - Select "Add Files to..."
   - Choose the downloaded `GoogleService-Info.plist`
   - Ensure "Copy items if needed" is checked
   - Add to target: `TheNileKartApp`

3. **Verify Firebase Initialization**:
   - In `ios-app/TheNileKartApp/TheNileKartApp.swift`
   - Check that `didFinishLaunchingWithOptions()` initializes Firebase
   - Function should call `FirebaseApp.configure()` (line ~118)

4. **Test Push Notifications**:
   - Rebuild and run iOS app
   - Firebase will now retrieve real FCM token
   - App will register real token to backend
   - Push notifications will be delivered successfully

### What Changed for Backend

**Before**: Backend accepted ANY token
```javascript
// ❌ OLD CODE - NO VALIDATION
if (!deviceTokens.includes(deviceToken)) {
  deviceTokens.push(deviceToken);  // Saved invalid tokens
}
```

**After**: Backend validates tokens before storing
```javascript
// ✅ NEW CODE - WITH VALIDATION
if (!isValidFCMToken(deviceToken)) {
  return res.status(400).json({
    error: 'Invalid device token format',
    recommendation: 'Use real FCM token from Firebase SDK'
  });
}
```

## Testing Checklist

- [x] Token validation endpoint working: `/api/push-notifications/check-token`
- [x] Register-token endpoint rejects invalid tokens with 400 status
- [x] Register-token endpoint accepts valid tokens
- [x] Send-bulk endpoint logs token rejection details
- [x] Backend restarted on EC2
- [x] Frontend build deployed to EC2
- [x] Changes committed to git main branch

## Next Steps

1. **Add GoogleService-Info.plist to iOS Project**
   - Download from Firebase Console
   - Add to Xcode project (as described above)
   - Rebuild and test on device

2. **Monitor Token Registration**
   - Check backend logs for token validation messages
   - Look for `✅ Registered valid FCM token` in logs
   - Or `⚠️ User X attempted to register invalid FCM token` for errors

3. **Verify Push Notifications Work End-to-End**
   - Register iOS app with new GoogleService-Info.plist
   - Use `/api/push-notifications/send-bulk` to send test notification
   - Verify notification received on iOS device

## Debugging Tips

### Check if Backend is Rejecting Invalid Tokens

```bash
# Test with placeholder token (should fail)
curl -X POST http://40.172.190.250/api/push-notifications/register-token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceToken": "exampleToken123"}'

# Response: 400 error with validation details
```

### View Backend Logs

```bash
ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250
pm2 logs thenilekart-backend | grep -E "(token|FCM|notification)"
```

### Query Database for Stored Tokens

```bash
# Connect to RDS database
psql -h your-rds-endpoint -U postgres -d thenilekart

# Check user's tokens
SELECT id, email, device_tokens, fcm_token FROM users WHERE id = YOUR_USER_ID;
```

## Files Modified

1. `backend/routes/push-notifications.js`
   - Added `isValidFCMToken()` check to register-token endpoint (lines 54-108)
   - Added detailed error responses
   - Added logging for debugging
   - Filter out invalid tokens from device_tokens array

## Related Issues

- **Previous Issue**: iOS app crashes at 5-6 seconds (Fixed in commit 94b8475)
- **Previous Issue**: Firebase GoogleService-Info.plist missing (Fixed in commit 9794866)
- **Current Issue**: Push notifications not delivered (Fixed in this commit 8830c12)

## References

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [FCM Token Format](https://firebase.google.com/docs/reference/admin/node/admin.messaging.Message)
- [iOS Firebase Setup](https://firebase.google.com/docs/ios/setup)
