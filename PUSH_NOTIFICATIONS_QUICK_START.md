# Push Notifications Feature - Quick Start Guide

## For Seller: How to Send Push Notifications

### Access the Feature
1. Log into seller dashboard: `https://thenilekart.com/seller/dashboard`
2. Look for the card with 📱 icon labeled "Send Notifications"
3. Click on it

### Send a Notification
1. **Enter Heading**: What will appear as the notification title
2. **Enter Message**: The notification body text
3. **Select Customers**: 
   - Use the search box to find customers
   - Check the boxes next to customer names
   - Can select multiple customers at once
4. **Preview**: See how the notification will look on the right side
5. **Send**: Click "Send Notifications" button
6. **Confirm**: Wait for success message

### Example
- **Heading**: "New Collection Available"
- **Message**: "Check out our latest summer collection with 30% discount!"
- **Select**: Checkboxes next to customers you want to notify
- **Preview**: See mock iOS notification
- **Send**: Click button → Success!

## Technical Details for Developers

### Route
- **Path**: `/seller/send-notifications`
- **Component**: `SendNotificationsPage.tsx`
- **Protection**: Seller-only (JWT required)

### API Endpoints
```
POST /api/push-notifications
Body: { customerId, title, body }

POST /api/push-notifications/bulk
Body: { customerIds: [...], title, body }

GET /seller/customers
Response: [{ id, name, email, ... }]
```

### Files
```
frontend/src/pages/SendNotificationsPage.tsx      (Main component - 340 lines)
frontend/src/styles/SendNotificationsPage.css     (Styling - 430+ lines)
frontend/src/pages/SellerDashboard.tsx            (Updated with card link)
frontend/src/App.tsx                               (Updated with route)
```

### Environment Variables Needed (Backend)
```
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

## Deployment Checklist

### Before EC2 Deployment
- [ ] Backend updated with latest push notification code
- [ ] Firebase credentials configured in backend .env
- [ ] Database migrations applied
- [ ] Frontend built locally: `npm run build`
- [ ] All TypeScript errors resolved

### Deployment Commands (EC2)
```bash
# SSH into server
ssh ubuntu@40.172.190.250

# Navigate to project
cd /home/ubuntu/var/www/thenilekart/TheNileKart

# Update code
git pull origin main

# Frontend build
cd frontend
npm install
npm run build

# Backend setup
cd ../backend
npm install
npm start

# Done!
```

## Testing the Feature

### Test Checklist
- [ ] Seller can log in
- [ ] Dashboard shows "Send Notifications" card
- [ ] Can navigate to `/seller/send-notifications`
- [ ] Customer list loads and displays
- [ ] Can search customers
- [ ] Can select/deselect customers
- [ ] Can type notification heading and message
- [ ] Preview updates as you type
- [ ] Can click send button
- [ ] Success message appears
- [ ] Push notification appears on iOS app
- [ ] Push notification appears on Android app

### Test Seller Account
- **Email**: maryam.zaidi2904@gmail.com
- **Role**: Seller
- **Access**: Full notifications feature

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Feature not visible | Rebuild frontend with `npm run build` |
| 404 on route | Check App.tsx route is configured |
| Auth error | Verify JWT token in localStorage |
| Customers don't load | Check `/seller/customers` API endpoint |
| Notifications don't send | Verify Firebase credentials configured |

## Useful URLs

- Dashboard: `https://thenilekart.com/seller/dashboard`
- Send Notifications: `https://thenilekart.com/seller/send-notifications`
- API Docs: `/api/docs` (if available)
- Firebase Console: https://console.firebase.google.com

## Database Schema

```sql
-- Stores sent notifications
CREATE TABLE push_notifications (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL,
  customer_ids JSONB,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  sent_count INTEGER,
  failed_count INTEGER,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tracks device tokens
CREATE TABLE device_tokens (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  platform VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Mobile App Integration

### iOS Received Notifications
- Handled by `PushNotificationManager.swift`
- Shows alert with title and body
- Stores notification in local notification center

### Android Received Notifications
- Handled by `PushNotificationService.java`
- Shows notification in notification center
- Click opens app with notification data

## Performance Notes

- Frontend build: ~2-3 minutes
- Bulk notifications: Can handle 1000+ customers
- Database queries optimized with indexes
- FCM rate limits: 9000 requests/minute

## Contact & Support

- Issue: SSH key not working → Check EC2 security group
- Build fails → Increase RAM or use CI/CD
- API errors → Check backend logs on EC2
- Database issues → Verify PostgreSQL connection

---

**Status**: ✅ Ready to Deploy
**Last Update**: Today
