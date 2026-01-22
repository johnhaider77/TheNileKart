# TheNileKart Deployment Guide

## Deployment Summary (21 Jan 2026)

### ✅ Completed Steps:

1. **Frontend Synced to EC2**
   - Project source code synced from local Mac to EC2 (40.172.190.250)
   - All files synchronized successfully (excluding node_modules, .git, logs)
   - Frontend build directory ready on EC2

2. **SSH Connection Verified**
   - SSH key configured: `~/.ssh/thenilekart-key2.pem`
   - EC2 instance: `ubuntu@40.172.190.250`
   - Project path: `/home/ubuntu/var/www/thenilekart/TheNileKart`

### 📋 Manual Steps to Complete Deployment:

#### Step 1: SSH into EC2
```bash
ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250
```

#### Step 2: Navigate to Project Directory
```bash
cd /home/ubuntu/var/www/thenilekart/TheNileKart
```

#### Step 3: Stop Existing Processes
```bash
pkill -f 'node server.js' || true
pkill -f 'npm start' || true
sleep 2
```

#### Step 4: Install Backend Dependencies
```bash
cd backend
npm install --production
```

#### Step 5: Start Backend Server
```bash
NODE_ENV=production nohup node server.js > /tmp/backend.log 2>&1 &
sleep 3
```

#### Step 6: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

#### Step 7: Start Frontend Server
```bash
BROWSER=none nohup npm start > /tmp/frontend.log 2>&1 &
sleep 5
```

#### Step 8: Verify Services are Running
```bash
ps aux | grep -E 'node|npm' | grep -v grep
```

### 🔍 Monitoring Deployed Services:

#### View Backend Logs
```bash
tail -50 /tmp/backend.log
```

#### View Frontend Logs
```bash
tail -50 /tmp/frontend.log
```

#### Check Backend Health
```bash
curl http://localhost:5000/api/health
```

#### Check Frontend Status
```bash
curl http://localhost:3000 | head -c 100
```

### 🌐 Access Deployed Services:

- **Frontend**: http://40.172.190.250:3000
- **Backend API**: http://40.172.190.250:5000

### 🚀 Automated Deployment Scripts Created:

1. **deploy-local-and-sync.sh** - Full deployment with local build
2. **simple-deploy.sh** - Quick deployment without local build

### 📝 Next Steps:

1. SSH into EC2 using the command above
2. Run the manual steps to start the services
3. Access the website at http://40.172.190.250:3000

---

**Project Root**: `/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart`
**EC2 Instance**: 40.172.190.250
**Date**: 21 January 2026

