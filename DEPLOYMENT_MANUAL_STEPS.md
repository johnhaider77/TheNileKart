# MANUAL DEPLOYMENT INSTRUCTIONS - Execute These Commands

## 🚀 Complete Deployment Workflow for Push Notifications Feature

### STATUS: 
✅ Frontend built locally (1.1MB compressed)
✅ Code ready in git main branch
⏳ Needs manual transfer and EC2 build

---

## EXECUTE THESE STEPS IN ORDER:

### STEP 1: On Your Mac - Create Frontend Archive
**Already done! File ready at:**
```
/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/frontend/build.tar.gz (1.1MB)
```

### STEP 2: On Your Mac - Transfer to EC2
**Choose ONE method:**

#### Method A: Using SCP (if SSH key works)
```bash
cd "/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart"
scp frontend/build.tar.gz ubuntu@40.172.190.250:/home/ubuntu/var/www/thenilekart/TheNileKart/
```

#### Method B: Using SSH with password
```bash
cd "/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart"
cat frontend/build.tar.gz | ssh ubuntu@40.172.190.250 'cat > /home/ubuntu/var/www/thenilekart/TheNileKart/build.tar.gz'
```

#### Method C: Upload via SFTP (if available)
```bash
sftp ubuntu@40.172.190.250
cd /home/ubuntu/var/www/thenilekart/TheNileKart
put frontend/build.tar.gz
exit
```

---

### STEP 3: On EC2 - SSH into Server
```bash
ssh ubuntu@40.172.190.250
# Enter password when prompted
```

### STEP 4: On EC2 - Navigate to Project
```bash
cd /home/ubuntu/var/www/thenilekart/TheNileKart
pwd  # Verify you're in correct directory
```

### STEP 5: On EC2 - Pull Latest Code from GitHub
```bash
git pull origin main
# This will get:
# - SendNotificationsPage.tsx component
# - SendNotificationsPage.css styling
# - Updated SellerDashboard.tsx
# - Updated App.tsx with routes
# - All documentation files
```

### STEP 6: On EC2 - Extract Frontend Build
```bash
# Extract the archive
tar -xzf build.tar.gz

# Backup old dist (if exists)
[ -d frontend/dist ] && mv frontend/dist frontend/dist.backup

# Move new build to dist
mv build frontend/dist

# Cleanup
rm -f build.tar.gz

# Verify extraction
ls -lh frontend/dist/index.html
# Should show: -rw-r--r-- ... index.html
```

### STEP 7: On EC2 - Install Backend Dependencies
```bash
cd /home/ubuntu/var/www/thenilekart/TheNileKart/backend

# Install npm dependencies
npm install

# Check for errors (output should end with "added XXX packages")
echo "✓ Backend dependencies installed"
```

### STEP 8: On EC2 - Restart Backend Service
```bash
# Restart the backend service
sudo systemctl restart thenilekart-backend

# Wait 2 seconds
sleep 2

# Check status (should show "active (running)")
sudo systemctl status thenilekart-backend

# View recent logs (Ctrl+C to exit)
sudo journalctl -u thenilekart-backend -n 50 -f
```

### STEP 9: On EC2 - Verify Deployment
```bash
# Check frontend is deployed
ls -lh /home/ubuntu/var/www/thenilekart/TheNileKart/frontend/dist/static/js/

# Test backend is running
curl -s http://localhost:5000/api/health || echo "Backend endpoint"

# Exit SSH
exit
```

---

## VERIFICATION CHECKLIST

After deployment, verify:

```bash
# On your Mac - test frontend
open http://40.172.190.250:3000
# Should load dashboard with "Send Notifications" card (📱)

# Login as seller maryam.zaidi2904@gmail.com
# Dashboard should show:
# - All previous cards (Orders, Inventory, Banners, etc.)
# - NEW CARD: "Send Notifications" with 📱 icon

# Click the "Send Notifications" card
# Should navigate to: /seller/send-notifications
# Page should show:
# - Notification heading input field
# - Notification message input field
# - Customer list with checkboxes
# - "Send Notifications" button
```

---

## IF TRANSFER FAILS

### Alternative: Git-based Sync
Since SCP doesn't work, code is already in git. On EC2, just do:

```bash
ssh ubuntu@40.172.190.250
cd /home/ubuntu/var/www/thenilekart/TheNileKart
git pull origin main

# Then manually transfer frontend or rebuild:
cd frontend
npm install
npm run build

# Note: This requires more RAM on EC2, but possible if you have memory
```

---

## FILE LOCATIONS

**On Mac:**
- Frontend build: `/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/frontend/build.tar.gz`
- Project root: `/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/`

**On EC2:**
- Deployment target: `/home/ubuntu/var/www/thenilekart/TheNileKart/frontend/dist/`
- Backend: `/home/ubuntu/var/www/thenilekart/TheNileKart/backend/`
- Service logs: `sudo journalctl -u thenilekart-backend`

---

## WHAT'S BEING DEPLOYED

### Frontend Changes:
1. **SendNotificationsPage.tsx** (340 lines)
   - Multi-select customer interface
   - Notification composition form
   - Real-time preview

2. **SendNotificationsPage.css** (403 lines)
   - Gradient purple background
   - Responsive grid layout
   - Mobile optimized

3. **SellerDashboard.tsx** (updated)
   - "Send Notifications" quick action card (📱)
   - Links to /seller/send-notifications

4. **App.tsx** (updated)
   - Route to /seller/send-notifications
   - Protected (seller-only) access
   - JWT authentication

### Backend (Already Implemented):
- Firebase Cloud Messaging integration
- Push notification API endpoints
- Device token management
- Database schema

---

## TROUBLESHOOTING

### Transfer fails with "Permission denied (publickey)"
```bash
# Use password-based transfer instead:
cat frontend/build.tar.gz | ssh ubuntu@40.172.190.250 'cat > build.tar.gz'
```

### "No space left on device" on EC2
```bash
# Check disk space
df -h
# May need to cleanup old builds or logs
```

### Backend won't restart
```bash
# Check for errors
sudo journalctl -u thenilekart-backend -n 100

# Check if port is in use
sudo lsof -i :5000

# Restart nginx/frontend server if needed
sudo systemctl restart nginx
```

### Frontend doesn't show new card
```bash
# Clear browser cache:
# - Chrome: Cmd+Shift+Delete
# - Firefox: Ctrl+Shift+Delete
# - Safari: Develop > Empty Caches

# Hard refresh page
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows/Linux)

# Check frontend is deployed
curl http://40.172.190.250:3000/index.html | grep -i "send.*notification"
```

---

## QUICK COMMAND COPY-PASTE

**For EC2 SSH session - paste all at once:**
```bash
cd /home/ubuntu/var/www/thenilekart/TheNileKart && \
git pull origin main && \
tar -xzf build.tar.gz && \
[ -d frontend/dist ] && mv frontend/dist frontend/dist.backup || true && \
mv build frontend/dist && \
rm -f build.tar.gz && \
cd backend && \
npm install && \
cd .. && \
sudo systemctl restart thenilekart-backend && \
sudo systemctl status thenilekart-backend
```

---

## STATUS AFTER COMPLETION

✅ Frontend deployed with push notification feature
✅ Backend rebuilt with latest code
✅ All services restarted
✅ Seller can access Send Notifications feature

**Feature visible to maryam.zaidi2904@gmail.com in dashboard!**

---

## NEXT STEPS

1. Execute transfer method (A, B, or C)
2. SSH into EC2
3. Run deployment commands (Steps 3-8)
4. Verify deployment (Step 9)
5. Test in browser

Questions? Check DEPLOYMENT_EC2_PUSH_NOTIFICATIONS.md for more details!
