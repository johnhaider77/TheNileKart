# Push Notification Implementation Guide

## Overview
This document provides comprehensive setup instructions for the push notification feature in TheNileKart, allowing sellers (including maryam.zaidi2904@gmail.com) to send push notifications to both iOS and Android apps.

## Feature Details
- **Two-line notifications**: Heading (title) and Message (body)
- **Deep linking**: When clicked, notifications open the app and navigate to Home page
- **Multi-platform**: Supports iOS, Android, and Web
- **Real-time**: Uses Firebase Cloud Messaging (FCM) for delivery

---

## Prerequisites

### 1. Firebase Project Setup
You need a Firebase project with Cloud Messaging enabled.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create or select existing project
3. Enable Cloud Messaging
4. Download service account key (JSON file)

### 2. Backend Environment Setup

Add these variables to `.env` and `.env.production`:

```env
# Firebase Cloud Messaging Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# Or use path to JSON file (recommended for local development)
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/path/to/firebase-service-account-key.json
```

### 3. iOS App Setup

#### Add Firebase to Xcode Project:

1. **Install Firebase SDK via CocoaPods**:
   ```bash
   cd ios-app
   pod install
   ```

2. **Download GoogleService-Info.plist**:
   - Go to Firebase Console → Project Settings → iOS
   - Download `GoogleService-Info.plist`
   - Add to Xcode project (check "Copy items if needed")

3. **Enable Push Capability in Xcode**:
   - Select project → Signing & Capabilities
   - Click "+ Capability"
   - Add "Push Notifications"
   - Add "Background Modes" → Enable "Remote notifications"

4. **Update AppDelegate.swift**:
   ```swift
   import Firebase
   
   func application(_ application: UIApplication, 
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
       FirebaseApp.configure()
       PushNotificationManager.shared.setupPushNotifications()
       return true
   }
   ```

### 4. Android App Setup

#### Add Firebase to Android Project:

1. **Add Firebase Dependencies** (build.gradle):
   ```gradle
   dependencies {
       implementation 'com.google.firebase:firebase-messaging:23.0.0'
   }
   
   apply plugin: 'com.google.gms.google-services'
   ```

2. **Download google-services.json**:
   - Go to Firebase Console → Project Settings → Android
   - Download `google-services.json`
   - Place in `android-app/app/` directory

3. **Add Permissions** (AndroidManifest.xml):
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="com.google.android.c2dm.permission.RECEIVE" />
   
   <service
       android:name=".services.PushNotificationService"
       android:exported="false">
       <intent-filter>
           <action android:name="com.google.firebase.MESSAGING_EVENT" />
       </intent-filter>
   </service>
   ```

### 5. Frontend (Web) Setup

1. **Install axios** (already included):
   ```bash
   npm install axios
   ```

2. **Add Environment Variable** (.env):
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

---

## Database Setup

### Run Migration

```bash
cd backend
node -e "const db = require('./config/database'); const fs = require('fs'); db.query(fs.readFileSync('../database/add_push_notifications.sql', 'utf8')).then(() => { console.log('✅ Push notification tables created'); process.exit(0); }).catch(err => { console.error('❌ Error:', err); process.exit(1); });"
```

Or manually execute the SQL:
```bash
psql -h your-db-host -U your-db-user -d your-db-name -f database/add_push_notifications.sql
```

### Tables Created:
- `push_notifications`: Stores all sent notifications
- `users.fcm_token`: Stores primary FCM token
- `users.device_tokens`: Stores all registered device tokens (JSONB array)

---

## API Endpoints

### 1. Register Device Token
**Endpoint**: `POST /api/push-notifications/register-token`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "deviceToken": "your-fcm-device-token"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Device token registered successfully",
  "deviceTokensCount": 1
}
```

### 2. Send Notification to Single User
**Endpoint**: `POST /api/push-notifications/send`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "recipientUserId": 2,
  "heading": "Order Confirmed!",
  "message": "Your order #123 has been confirmed and is being processed.",
  "actionType": "home",
  "actionData": {
    "orderId": 123
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Notification sent",
  "notificationId": 5,
  "devicesSent": 2,
  "devicesFailed": 0,
  "details": {...}
}
```

### 3. Send Bulk Notifications
**Endpoint**: `POST /api/push-notifications/send-bulk`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "recipientUserIds": [2, 3, 4],
  "heading": "New Collection Alert!",
  "message": "Check out our latest products",
  "actionType": "home"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Bulk notification sent",
  "recipientsCount": 3,
  "totalDevices": 5,
  "devicesSent": 5,
  "devicesFailed": 0
}
```

### 4. Get Notification History
**Endpoint**: `GET /api/push-notifications/history?limit=20&offset=0`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response**:
```json
{
  "success": true,
  "notifications": [
    {
      "id": 5,
      "seller_id": 1,
      "heading": "Order Confirmed!",
      "message": "Your order has been confirmed.",
      "action_type": "home",
      "sent_at": "2026-02-13T10:30:00Z",
      "read_at": null,
      "status": "sent"
    }
  ],
  "count": 1
}
```

### 5. Mark Notification as Read
**Endpoint**: `PUT /api/push-notifications/:notificationId/read`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response**:
```json
{
  "success": true,
  "notification": {
    "id": 5,
    "read_at": "2026-02-13T10:31:00Z"
  }
}
```

### 6. Get Unread Count
**Endpoint**: `GET /api/push-notifications/unread/count`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response**:
```json
{
  "success": true,
  "unreadCount": 3
}
```

---

## Frontend Integration

### Setup Push Notifications

Add to your main app component (e.g., App.tsx):

```typescript
import { setupPushNotifications } from './services/pushNotificationService';
import PushNotificationPanel from './components/PushNotificationPanel';

function App() {
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (token) {
      setupPushNotifications(token);
    }
  }, [token]);

  return (
    <>
      {/* ... existing components ... */}
      {token && (
        <PushNotificationPanel 
          userToken={token} 
          userId={user.id}
          userType={user.user_type}
        />
      )}
    </>
  );
}
```

### Send Notification (Seller Example)

```typescript
import { sendPushNotification } from './services/pushNotificationService';

async function sendNotificationToCustomer() {
  try {
    const result = await sendPushNotification(
      customerId,
      "Order Ready for Pickup!",
      "Your order is ready and waiting for you to pick up.",
      'home',
      { orderId: 123 },
      token
    );

    if (result.success) {
      alert(`Notification sent to ${result.devicesSent} devices!`);
    }
  } catch (error) {
    alert('Failed to send notification');
  }
}
```

---

## iOS Implementation Details

The `PushNotificationManager.swift` handles:

1. **Token Management**:
   - Requests user permission for notifications
   - Fetches and stores FCM token
   - Registers token with backend

2. **Notification Reception**:
   - Handles foreground notifications
   - Handles background notifications
   - Parses notification data

3. **Deep Linking**:
   - Routes notifications to appropriate screens
   - Supports actions: `home`, `product`, `order`, `seller`

### Navigation Routing

Modify the `routeToNotificationAction` method in `PushNotificationManager.swift` to match your app's navigation structure:

```swift
case "product":
    if let productId = notification.actionData["productId"] {
        // Navigate to your ProductDetailViewController
        let productVC = ProductDetailViewController(productId: productId)
        navController?.pushViewController(productVC, animated: true)
    }
```

---

## Android Implementation Details

The `PushNotificationService.java` handles:

1. **Token Management**:
   - Receives new tokens when refreshed
   - Stores tokens in SharedPreferences
   - Sends tokens to backend

2. **Notification Display**:
   - Creates notification channels (Android 8+)
   - Displays notifications with title and body
   - Shows notifications in notification center

3. **Deep Linking**:
   - Captures notification taps
   - Passes action data to MainActivity
   - Routes to appropriate fragments

### Navigation Routing

Modify the `routeToNotificationAction` method in `MainActivity.java`:

```java
case "product":
    if (actionData.has("productId")) {
        int productId = actionData.getInt("productId");
        Bundle bundle = new Bundle();
        bundle.putInt("product_id", productId);
        navController.navigate(R.id.productDetailFragment, bundle);
    }
```

---

## Testing

### 1. Test Sending Notifications (Postman/cURL)

```bash
curl -X POST http://localhost:5000/api/push-notifications/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientUserId": 2,
    "heading": "Test Notification",
    "message": "This is a test notification",
    "actionType": "home"
  }'
```

### 2. Register Device Token

```bash
curl -X POST http://localhost:5000/api/push-notifications/register-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceToken": "YOUR_FCM_TOKEN"
  }'
```

### 3. Check Notification History

```bash
curl -X GET http://localhost:5000/api/push-notifications/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Troubleshooting

### Firebase Token Not Generated
- Ensure Firebase SDK is properly installed
- Check AndroidManifest.xml / Info.plist has correct permissions
- Verify google-services.json / GoogleService-Info.plist is in correct location

### Notifications Not Received
- Verify device token is registered with backend
- Check app has notification permissions granted
- Ensure app is not in "Do Not Disturb" mode (iOS/Android)

### Deep Linking Not Working
- Verify actionType and actionData are being sent correctly
- Check navigation routes match action types
- Test notification received callback is triggered

### Backend Issues
- Verify FIREBASE_SERVICE_ACCOUNT_KEY environment variable is set correctly
- Check Firebase project ID matches in backend config
- Ensure Firebase Cloud Messaging is enabled in project

---

## Production Deployment

### 1. Update .env.production
```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

### 2. Build Frontend
```bash
cd frontend
npm run build
```

### 3. Deploy Backend
- Sync code to EC2
- Run database migration
- Restart backend service

### 4. Build and Deploy Mobile Apps
- Update Firebase project settings for production
- Build APK for Android
- Build IPA for iOS
- Deploy to app stores

---

## Security Considerations

1. **JWT Authentication**: All endpoints require valid JWT token
2. **Seller Verification**: Only sellers can send notifications
3. **Rate Limiting**: Prevent notification spam (already configured on server)
4. **Data Validation**: All inputs validated before processing
5. **Error Logging**: Errors logged server-side without exposing details

---

## Support

For issues or questions about push notification setup, refer to:
- Firebase Documentation: https://firebase.google.com/docs/cloud-messaging
- The Backend README: See backend/README.md
- Implementation Examples: Check test files in backend/

---

## Summary of Changes

### Files Created/Modified:

**Backend**:
- `database/add_push_notifications.sql` - Database schema
- `backend/services/pushNotificationService.js` - FCM service
- `backend/routes/push-notifications.js` - API endpoints
- `backend/server.js` - Route registration

**Frontend**:
- `frontend/src/services/pushNotificationService.ts` - Service
- `frontend/src/components/PushNotificationPanel.tsx` - UI component
- `frontend/src/components/PushNotificationPanel.css` - Styles

**iOS**:
- `ios-app/TheNileKart/Services/PushNotificationManager.swift` - Notification handler

**Android**:
- `android-app/app/src/main/java/com/example/thenilekart/services/PushNotificationService.java`
- `android-app/app/src/main/java/com/example/thenilekart/MainActivity.java`

---

Last Updated: February 13, 2026
