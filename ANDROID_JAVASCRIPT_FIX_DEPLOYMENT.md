# Android WebView JavaScript Syntax Fix - Deployment Guide

## Problem
The Android WebView was showing "Uncaught SyntaxError: Unexpected end of input" when loading the React app. This was caused by source map references (`//# sourceMappingURL=...`) in the minified JavaScript files.

## Root Cause
The React build process was generating source maps in production, which caused the browser to attempt loading `.js.map` files that didn't exist. This incomplete file loading resulted in syntax errors.

## Solution Implemented
1. Created `.env.production` file with `GENERATE_SOURCEMAP=false`
2. Rebuilt the frontend with `npm run build`
3. The new build (`main.cfadd703.js`) no longer contains source map references
4. Committed configuration to git

## Deployment Steps to EC2

### Option 1: Manual File Copy (via SCP or SFTP)
```bash
# From local machine, copy the new build
cd ~/path/to/TheNileKart

# Create tarball of the build
tar -czf frontend-build-new.tar.gz frontend/build/

# Copy to EC2 (requires SSH access)
scp -i your-key.pem frontend-build-new.tar.gz ubuntu@40.172.190.250:/tmp/

# SSH into EC2 and extract
ssh -i your-key.pem ubuntu@40.172.190.250
cd /var/www/thenilekart
tar -xzf /tmp/frontend-build-new.tar.gz --strip-components=2

# Stop and restart the backend
pm2 restart thenilekart-backend
```

### Option 2: Git-based Deployment (Recommended)
```bash
# On the EC2 instance (assuming git repo is cloned):
cd /path/to/git/TheNileKart
git pull origin main

# Rebuild the frontend
cd frontend
npm ci  # or npm install if not cached
npm run build
GENERATE_SOURCEMAP=false npm run build

# Copy to web root
sudo cp -r build/* /var/www/thenilekart/build/

# Restart backend
pm2 restart thenilekart-backend
```

### Option 3: Direct Backend Update (if running from git)
```bash
cd /var/www/thenilekart
git pull origin main
cd frontend
npm install
GENERATE_SOURCEMAP=false npm run build
# If served from git directory, no copy needed
```

## Android APK Update
Once the backend is updated:
1. The new APK already includes the aggressive CSS injection fixes
2. Simply restart the app or uninstall/reinstall
3. The app will load the new frontend from the backend

## Verification
Check the browser console logs on the device:
- Should see: "✅ Aggressive CSS fix applied" 
- Should NOT see: "Uncaught SyntaxError"
- React should render content instead of blank screen

## File Details
- Old build: `main.ff1608b4.js` (701KB, had source map reference)
- New build: `main.cfadd703.js` (702KB, no source map reference)
- .env.production: Added with `GENERATE_SOURCEMAP=false`

## Git Commit
- Commit: `c2e5b67`
- Message: "fix: Add .env.production to disable source maps in React build"
