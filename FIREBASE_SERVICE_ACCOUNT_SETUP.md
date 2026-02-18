# Firebase Service Account Setup for Push Notifications

## Problem
Push notifications are failing because the Firebase service account key is not configured.

## Solution

### Step 1: Get Firebase Service Account Key
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project `thenilekart-4e16d`
3. Go to **APIs & Services** → **Credentials**
4. Click **+ Create Credentials** → **Service Account**
5. Fill in the details and create the service account
6. Click on the created service account
7. Go to **Keys** tab
8. Click **Add Key** → **Create new key** → **JSON**
9. This will download a JSON file - **save this file carefully**

### Step 2: Set Environment Variable on EC2

On your EC2 instance:

```bash
# Read the JSON key file and convert to environment variable
export FIREBASE_SERVICE_ACCOUNT_KEY=$(cat /path/to/firebase-service-account-key.json | jq -c .)

# Add to PM2 environment
pm2 ecosystem init

# Edit ecosystem.config.js and add:
env: {
  FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY
}

# Restart PM2
pm2 restart all --update-env
```

### Step 3: Local Development (Optional)

Place the `firebase-service-account-key.json` file in:
```
backend/firebase-service-account-key.json
```

**⚠️ IMPORTANT: Never commit this file to git! Add to .gitignore:**
```
firebase-service-account-key.json
```

### Verification

Test if push notifications work:
```bash
# Backend logs should show:
# ✅ Firebase access token obtained successfully
# 📤 Sending notification to device: <token>
```

## Troubleshooting

### Error: "Firebase service account key not found"
- Ensure FIREBASE_SERVICE_ACCOUNT_KEY environment variable is set
- Or place firebase-service-account-key.json in backend/ directory

### Error: "Failed to authenticate with Firebase"
- Verify the service account has "Cloud Messaging" API enabled
- Check that the private key in the JSON is complete and valid

### Error: "Invalid device token"
- Ensure the device token is 140+ characters
- Verify the app is receiving real FCM tokens (not test tokens)
- Check Firebase initialization in the app

