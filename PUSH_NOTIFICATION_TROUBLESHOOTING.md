# Push Notification Troubleshooting Guide

**Status**: 🔴 Getting 200 OK but notifications not received

## Root Causes Identified

### 1. ❌ **Firebase Service Account Key Missing**
- **Impact**: Notifications CANNOT be sent to devices
- **Error**: `Firebase service account key not configured`
- **Diagnostic**: `curl -X GET http://localhost:5000/api/push-notifications/diagnostic -H 'Authorization: Bearer <token>'`

### 2. ❌ **No Device Tokens Registered**
- **Impact**: Even if Firebase works, there's nowhere to send the notification
- **Current State**: User 9 has 0 registered device tokens
- **Problem**: The test used "exampleToken123" (invalid test token)

---

## How to Fix

### Step 1: Set Up Firebase Service Account Key

#### Option A: Via Environment Variable (Recommended for Production)

1. **Get your Firebase service account key**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Settings → Service Accounts → Generate Key (Python/Node.js)
   - Copy the entire JSON key

2. **Set the environment variable on EC2**:
   ```bash
   ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250
   
   # Edit .env.production
   nano /home/ubuntu/var/www/thenilekart/TheNileKart/.env.production
   
   # Add this line (paste the entire JSON as one line):
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project","private_key":"...","client_email":"..."}'
   
   # Restart backend
   pm2 restart thenilekart-backend
   ```

#### Option B: Via File (Development)

1. Place the JSON file at:
   ```
   /home/ubuntu/var/www/thenilekart/TheNileKart/firebase-service-account-key.json
   ```

2. Restart backend:
   ```bash
   pm2 restart thenilekart-backend
   ```

---

### Step 2: Register Real Device Tokens

The iOS app needs to:

1. **Request notification permissions** from the user
2. **Get FCM device token** from Firebase Messaging
3. **Send token to backend** via `/api/push-notifications/register-token`

#### On iOS (Swift Code Example):

```swift
import FirebaseMessaging

func registerForNotifications() {
  UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
    guard granted else { return }
    
    Messaging.messaging().token { token, error in
      if let error = error {
        print("Error getting FCM token: \(error)")
        return
      }
      
      guard let token = token else { return }
      print("FCM Token: \(token)")
      
      // Send to backend
      let url = URL(string: "https://thenilekart.com/api/push-notifications/register-token")!
      var request = URLRequest(url: url)
      request.httpMethod = "POST"
      request.setValue("Bearer \(userJWTToken)", forHTTPHeaderField: "Authorization")
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      
      let body = ["deviceToken": token]
      request.httpBody = try? JSONSerialization.data(withJSONObject: body)
      
      URLSession.shared.dataTask(with: request) { data, response, error in
        print("Device token registered successfully")
      }.resume()
    }
  }
}
```

---

### Step 3: Test the Full Flow

#### Test 1: Check Diagnostic Status
```bash
curl -X GET http://localhost:5000/api/push-notifications/diagnostic \
  -H 'Authorization: Bearer <jwt-token>'
```

**Expected Output**:
```json
{
  "success": true,
  "deviceTokens": {
    "count": 1,
    "tokens": [
      {
        "token": "cHhwaExWajBZTEtnbVUz...",
        "isValid": "✅ Likely valid"
      }
    ]
  },
  "firebase": {
    "configured": "Yes",
    "status": "✅ Ready"
  }
}
```

#### Test 2: Send Test Notification
```bash
curl -X POST http://localhost:5000/api/push-notifications/send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <seller-jwt-token>' \
  -d '{
    "recipientUserId": 10,
    "heading": "Test Notification",
    "message": "This is a test",
    "actionType": "home",
    "actionData": {}
  }'
```

**Expected Response** (if everything works):
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "devicesSent": 1,
  "devicesFailed": 0,
  "debugInfo": {
    "deviceTokensRegistered": 1,
    "deviceTokensSample": "cHhwaExWajBZTEtnbVUz..."
  }
}
```

#### Test 3: Check Logs
```bash
ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250 \
  "pm2 logs thenilekart-backend --lines 20 --nostream | tail -30"
```

**Look for**:
- ✅ `Firebase access token obtained successfully`
- ✅ `Push notification sent successfully to FCM`
- ❌ `Firebase service account key not configured` (if this appears, Firebase key is missing)
- ❌ `Invalid device token` (if token format is wrong)

---

## Checklist for Push Notifications to Work

- [ ] **Firebase service account key configured** (environment variable or file)
  - [ ] Verified with diagnostic endpoint: `firebase.configured: "Yes"`
  
- [ ] **Device tokens registered** (user has at least 1 token)
  - [ ] User opened the app
  - [ ] App requested notification permission
  - [ ] App registered FCM token with backend
  - [ ] Database shows tokens: `SELECT device_tokens FROM users WHERE id = <user_id>;`
  
- [ ] **Device allows notifications**
  - [ ] Notifications enabled in iOS Settings → TheNileKart
  - [ ] Sound/Badge enabled (optional but recommended)
  
- [ ] **Valid sender**
  - [ ] Sender is authenticated (valid JWT token)
  - [ ] Sender is a seller (user_type = 'seller')
  - [ ] Recipient exists in database
  
- [ ] **Test successful**
  - [ ] Diagnostic shows Firebase ready
  - [ ] Send returns 200 with devicesSent: 1
  - [ ] Notification appears on device screen within 1-2 seconds

---

## Common Errors and Solutions

### Error: "Firebase service account key not configured"
**Solution**: 
- Set `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable on EC2
- Or place `firebase-service-account-key.json` in backend root
- Restart backend with `pm2 restart thenilekart-backend`

### Error: "Invalid device token or malformed request"
**Solution**:
- Device tokens must be 150+ characters (FCM format)
- Make sure you're using real tokens from the app, not test tokens
- Verify device has opened the app and granted notifications permission

### Error: "Recipient has no registered devices"
**Solution**:
- User hasn't registered their device token yet
- Have the user:
  1. Open the app on their device
  2. Grant notification permissions
  3. Wait for token to be registered (automatic)
- Verify in database: `SELECT device_tokens FROM users WHERE id = <user_id>;`

### Notification sent but not received on phone
**Solution**:
- Check iOS notification settings: Settings → TheNileKart → Notifications
- Verify badge/sound are enabled
- Check if app is in background (notifications work there)
- Check Firebase delivery status in diagnostic: `devicesSent vs devicesFailed`

---

## Database Queries for Debugging

```sql
-- Check user's device tokens
SELECT id, email, user_type, device_tokens FROM users WHERE id = 9;

-- Check recent notifications
SELECT id, seller_id, recipient_user_id, heading, message, status, created_at 
FROM push_notifications 
ORDER BY created_at DESC 
LIMIT 5;

-- Count notifications sent to a user
SELECT COUNT(*) FROM push_notifications WHERE recipient_user_id = 10;
```

---

## Next Steps

1. **Set Firebase key** on EC2
2. **Register device token** via iOS app
3. **Test diagnostic endpoint** to confirm setup
4. **Send test notification** and verify on device
5. **Check logs** for any errors
6. **Enable notifications** in iOS Settings if not appearing

---

**Last Updated**: 2026-02-13  
**Status**: Ready for deployment after Firebase configuration
