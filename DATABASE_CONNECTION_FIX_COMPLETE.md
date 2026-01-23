# Database Connection Issue - Complete Resolution

**Date**: January 23, 2026
**Status**: ✅ RESOLVED

## Executive Summary

Successfully resolved database connectivity issue preventing backend server from connecting to AWS RDS. The problem was caused by missing environment configuration file on EC2 and incorrect file path resolution in Node.js dotenv module loading.

**Result**: All APIs now fully operational
- ✅ `/api/health` - Server responding
- ✅ `/api/banners` - Fetching 2 banners from database
- ✅ `/api/products` - Fetching 18 products from database

---

## Problem Statement

### Symptoms
- Backend server appeared to be running (PM2 status: online) but returning database connection errors
- API calls returned error: `"connect ECONNREFUSED 127.0.0.1:5432"`
- This indicated the application was trying to connect to `localhost:5432` instead of RDS endpoint

### Root Cause Analysis

**Root Cause #1: Missing .env.production File**
- EC2 production server had NO `.env.production` file
- When `NODE_ENV=production`, backend code tried to load `.env.production` with RDS credentials
- File didn't exist, so environment variables remained undefined
- Application fell back to hardcoded defaults: `localhost:5432`

**Root Cause #2: Incorrect File Path in Node.js**
- `backend/server.js` was looking for `.env.production` in the wrong directory
- Used: `path.join(__dirname, envFile)` 
- `__dirname` = `/backend/` directory, but `.env.production` is in `/` (root project directory)
- Result: Looking for `/backend/.env.production` instead of `/.env.production`

**Root Cause #3: Redundant dotenv Loading**
- `backend/config/s3Upload.js` was calling `require('dotenv').config()`
- This attempted to load `.env` (development file) again, overwriting previous settings
- Since `.env` also didn't exist, S3 configuration failed with "bucket is required" error

---

## Solution Implementation

### Step 1: Create .env.production File on EC2
**File**: `/home/ubuntu/var/www/thenilekart/TheNileKart/.env.production`

```env
# Database Configuration (Production - RDS)
DB_HOST=thenilekart-postgres.cr808sek6c09.me-central-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=thenilekart
DB_USER=thenilekart_admn
DB_PASSWORD=YAm786123

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=production

# CORS Configuration
FRONTEND_URL=https://www.thenilekart.com

# S3 Storage Configuration
S3_BUCKET_NAME=thenilekart-images-prod
USE_LOCAL_STORAGE=true

# Email Configuration (Optional)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# SMS Configuration (Optional)  
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

**Action**: Created via SSH on EC2 with proper RDS credentials

### Step 2: Fix File Path in backend/server.js
**Before**:
```javascript
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });
```

**After**:
```javascript
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });
```

**Change**: Added `'..'` to go up one directory from `/backend/` to project root

**Commit**: `eb75b68` - "Fix: Correct .env.production file path in server.js"

### Step 3: Remove Redundant dotenv Loading
**File**: `backend/config/s3Upload.js`

**Before**:
```javascript
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
```

**After**:
```javascript
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');
// Note: dotenv is already loaded by server.js or database.js, no need to load again
```

**Reason**: Environment is already loaded by `server.js`, no need to reload

**Commit**: `c60d1af` - "Fix: Remove redundant dotenv.config() in s3Upload.js"

### Step 4: Update Deployment Process
Enhanced `deploy-all.sh` to sync `.env.production` to EC2 and restart PM2 fresh:

```bash
# Delete existing process
pm2 delete server 2>/dev/null || true

# Start fresh with ecosystem config and NODE_ENV=production
pm2 start ecosystem.config.js --only server --update-env
```

---

## Verification

### Database Configuration Confirmed in Logs
```
🔧 Loading database config for environment: production
🔍 DB Config - Host: thenilekart-postgres.cr808sek6c09.me-central-1.rds.amazonaws.com
🔍 DB Config - Database: thenilekart
🔍 DB Config - User: thenilekart_admn
🔍 DB Config - Password: ***6123
🔍 DB Config - Port: 5432
🔍 RDS Detected: YES
🔍 SSL Enabled: YES
```

### API Testing Results
```
✅ Health Check: http://40.172.190.250:5000/api/health
   Response: {"status":"OK","timestamp":"2026-01-23T07:28:05.856Z","uptime":57.498687335}

✅ Banners API: http://40.172.190.250:5000/api/banners
   Response: {"success":true,"banners":[...]} - 2 banners returned

✅ Products API: http://40.172.190.250:5000/api/products
   Response: {"products":[...]} - 18 products returned with pagination
```

### Frontend Access Verified
```
✅ Homepage: https://www.thenilekart.com/
   Status: 200 OK - React app loading correctly
```

---

## Files Modified

1. **backend/server.js** (Line 12)
   - Fixed `.env.production` file path resolution
   - Changed: `path.join(__dirname, envFile)` → `path.join(__dirname, '..', envFile)`

2. **backend/config/s3Upload.js** (Lines 1-6)
   - Removed redundant `require('dotenv').config()` call
   - Added comment explaining dotenv is pre-loaded

3. **ecosystem.config.js** (Updated)
   - Added PORT environment variable
   - Improved path handling with fallback

4. **deploy-all.sh** (Updated)
   - Ensures `ecosystem.config.js` is synced to EC2
   - Restarts PM2 fresh on each deployment

---

## Key Learnings

1. **Environment Configuration Order Matters**
   - dotenv must load before any module that uses environment variables
   - Only load dotenv once, at application startup

2. **File Path Resolution**
   - `__dirname` is relative to the file location, not the project root
   - Need to use `path.join(__dirname, '..')` to go up directories
   - Always test file paths with console.log during debugging

3. **Production vs Development**
   - Keep `.env` and `.env.production` in the same location (project root)
   - Use NODE_ENV to determine which file to load
   - Both files should be git-ignored

4. **PM2 Configuration**
   - Use ecosystem.config.js for complex configurations
   - Environment variables should be in `.env` files, not just ecosystem config
   - Always test after restarting processes

---

## Deployment Instructions for Future Reference

### To Deploy:
```bash
# 1. Make changes locally
cd /Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart

# 2. Commit and push
git add .
git commit -m "Your message"
git push origin main

# 3. Deploy to production
bash deploy-all.sh both  # or "backend" for backend only, "frontend" for frontend only

# 4. Verify
curl http://40.172.190.250:5000/api/health
curl http://40.172.190.250:5000/api/banners
curl http://40.172.190.250:5000/api/products
```

### If Database Still Not Connecting:
1. SSH to EC2 and verify `.env.production` exists:
   ```bash
   ssh -i ~/.ssh/thenilekart-EC2Key.pem ubuntu@40.172.190.250
   cat /home/ubuntu/var/www/thenilekart/TheNileKart/.env.production | head
   ```

2. Check PM2 logs:
   ```bash
   pm2 logs server --lines 50
   ```

3. Look for "DB Config - Host:" in logs to confirm RDS endpoint is being used

---

## Timeline

| Time | Action | Status |
|------|--------|--------|
| 07:20 | Initial database connection failure detected | ❌ |
| 07:21 | Created .env.production on EC2 | ⏳ |
| 07:24 | Discovered config loading but still failing | ⏳ |
| 07:26 | Identified incorrect file path in server.js | ✅ |
| 07:27 | Fixed file path and redeployed | ✅ |
| 07:28 | All APIs responding correctly | ✅ |

---

## Summary

The issue was successfully resolved by:
1. Creating the missing `.env.production` file with correct RDS credentials on EC2
2. Fixing the file path resolution in `server.js` to look in the correct directory
3. Removing redundant dotenv loading in `s3Upload.js`
4. Testing all endpoints to confirm functionality

**Current Status**: ✅ **PRODUCTION READY**

All products and banners are now displaying correctly on the frontend via the database-backed APIs.

