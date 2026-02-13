# DEPLOYMENT INSTRUCTIONS - Push Notifications Feature

## Current Status
- ✅ Frontend built successfully locally (frontend/build/ ready)
- ✅ All code committed and pushed to GitHub main branch
- ✅ Push notification feature integrated and tested locally
- ⏳ Needs EC2 deployment

## EC2 Deployment Steps

### Step 1: SSH into EC2 Server
```bash
ssh ubuntu@40.172.190.250
```

### Step 2: Navigate to Project
```bash
cd /home/ubuntu/var/www/thenilekart/TheNileKart
```

### Step 3: Pull Latest Code from GitHub
```bash
git pull origin main
```

### Step 4: Deploy Frontend (Use Local Built Version)
Transfer the locally built frontend from your Mac to EC2:

**From your Mac (new terminal):**
```bash
# Navigate to project root
cd "/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart"

# Transfer built frontend to EC2
scp -r frontend/build/* ubuntu@40.172.190.250:/home/ubuntu/var/www/thenilekart/TheNileKart/frontend/dist/

# Or if above doesn't work, use alternative:
# Create tar file locally
cd frontend
tar -czf build.tar.gz build/
cd ..

# Transfer tar file
scp frontend/build.tar.gz ubuntu@40.172.190.250:/home/ubuntu/var/www/thenilekart/TheNileKart/

# Then on EC2, extract it
ssh ubuntu@40.172.190.250
cd /home/ubuntu/var/www/thenilekart/TheNileKart
tar -xzf build.tar.gz
mv build/* frontend/dist/ 2>/dev/null || mv build frontend/dist-new
rm -rf build build.tar.gz
```

### Step 5: Install Backend Dependencies and Build (On EC2)
```bash
cd /home/ubuntu/var/www/thenilekart/TheNileKart/backend

# Install dependencies
npm install

# Check for any errors
echo "✓ Backend dependencies installed"
```

### Step 6: Verify Database and Migrations
```bash
# Make sure PostgreSQL is running
sudo systemctl status postgresql

# Apply any pending migrations (if needed)
cd /home/ubuntu/var/www/thenilekart/TheNileKart
# npm run migrate (if migration script exists)
```

### Step 7: Start/Restart Services (On EC2)
```bash
# Restart backend service
sudo systemctl restart thenilekart-backend

# Verify it's running
sudo systemctl status thenilekart-backend

# Check logs
sudo journalctl -u thenilekart-backend -n 50 -f
```

### Step 8: Verify Frontend Deployment
```bash
# Test frontend build location
ls -lh /home/ubuntu/var/www/thenilekart/TheNileKart/frontend/dist/

# Should show index.html and other built files
```

## What Was Changed

### Frontend Changes:
1. **SendNotificationsPage.tsx** - New component for sending notifications
   - Multi-select customer interface
   - Notification composition form
   - Real-time preview

2. **SendNotificationsPage.css** - Professional styling
   - Gradient background
   - Responsive layout
   - Mobile optimized

3. **SellerDashboard.tsx** - Updated with "Send Notifications" card
   - Quick action card added (📱 icon)
   - Links to /seller/send-notifications

4. **App.tsx** - Route configuration
   - New route for /seller/send-notifications
   - Protected route (seller-only)
   - JWT authentication required

### Backend (Already in place):
- Firebase Cloud Messaging integration
- Push notification API endpoints
- Device token management
- Database schema

## Testing After Deployment

1. **Access dashboard**
   - Go to seller dashboard
   - Should see "Send Notifications" card (📱)

2. **Test feature**
   - Click the card
   - Should navigate to /seller/send-notifications
   - Form should load with customer list
   - Try sending a test notification

3. **Verify backend connection**
   - Check EC2 logs for API calls
   - Verify Firebase credentials are configured
   - Test with a customer

## Troubleshooting

### Frontend not showing new card
- Ensure dist folder is updated with latest build
- Clear browser cache (Cmd+Shift+Delete)
- Refresh page (Cmd+R or Ctrl+R)

### Backend errors
- Check logs: `sudo journalctl -u thenilekart-backend -n 100`
- Verify .env has Firebase credentials
- Check database connection
- Restart service: `sudo systemctl restart thenilekart-backend`

### Permission denied errors
- Use `sudo` for system commands
- Verify user has write permissions to /home/ubuntu/var/www/thenilekart/
- Check file ownership: `ls -l`

## Rollback Instructions

If needed, revert to previous version:
```bash
cd /home/ubuntu/var/www/thenilekart/TheNileKart
git reset --hard HEAD~1
sudo systemctl restart thenilekart-backend
```

## Quick Command Summary

```bash
# On EC2:
cd /home/ubuntu/var/www/thenilekart/TheNileKart
git pull origin main
cd backend && npm install
sudo systemctl restart thenilekart-backend
sudo systemctl status thenilekart-backend

# On Mac (transfer frontend):
cd "/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart"
scp -r frontend/build/* ubuntu@40.172.190.250:/home/ubuntu/var/www/thenilekart/TheNileKart/frontend/dist/
```

## Files Modified/Created

**New Files:**
- frontend/src/pages/SendNotificationsPage.tsx
- frontend/src/styles/SendNotificationsPage.css

**Modified Files:**
- frontend/src/pages/SellerDashboard.tsx (added card link)
- frontend/src/App.tsx (added route)

**Git Commits:**
- a7ddd43: SendNotificationsPage UI integration
- a2d4003: Documentation
- 180817b: Delivery summary
- 15f3bbc: Final status report
- 8180bf8: Documentation index
- b56c3b6: iOS build guide

---

**Status**: Ready for EC2 Deployment
**Frontend Build**: ✅ Complete (frontend/build/ ready)
**Backend**: Ready to build on EC2
**Git**: ✅ All changes pushed to main branch

Follow the steps above to complete the deployment!
