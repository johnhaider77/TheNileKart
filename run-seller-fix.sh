#!/bin/bash

# Seller Login Fix - Maryam Zaidi Account
# This script documents all the steps taken to fix the authentication issue

echo "================================================"
echo "SELLER LOGIN FIX - MARYAM ZAIDI"
echo "================================================"
echo ""
echo "Issue: Authentication Failed for maryam.zaidi2904@gmail.com"
echo "Root Cause: Password hash mismatch in database"
echo ""

echo "STEP 1: Reset Password on EC2"
echo "================================"
ssh -i ~/.ssh/thenilekart-key.pem ubuntu@40.172.190.250 << 'RESET_PASS'
cd /home/ubuntu/var/www/thenilekart/TheNileKart/backend
node reset-maryam-pass.js
RESET_PASS

echo ""
echo "STEP 2: Verify Password Works"
echo "=============================="
ssh -i ~/.ssh/thenilekart-key.pem ubuntu@40.172.190.250 << 'VERIFY_PASS'
cd /home/ubuntu/var/www/thenilekart/TheNileKart/backend
cat > verify-login.js << 'EOF'
const bcrypt = require("bcryptjs");
const db = require("./config/database");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env.production") });

async function verify() {
  try {
    const email = "maryam.zaidi2904@gmail.com";
    const password = "Maryam@123456";
    
    const user = await db.query(
      "SELECT password_hash FROM users WHERE email = $1",
      [email]
    );
    
    if (user.rows.length > 0) {
      const isValid = await bcrypt.compare(password, user.rows[0].password_hash);
      console.log(`✅ Password verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);
    }
    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}
verify();
EOF
node verify-login.js
VERIFY_PASS

echo ""
echo "STEP 3: Restart Services"
echo "========================"
ssh -i ~/.ssh/thenilekart-key.pem ubuntu@40.172.190.250 'pm2 restart thenilekart-backend && sleep 2 && pm2 status'

echo ""
echo "STEP 4: Check Backend Logs"
echo "==========================="
ssh -i ~/.ssh/thenilekart-key.pem ubuntu@40.172.190.250 'pm2 logs thenilekart-backend --lines 50 --nostream'

echo ""
echo "================================================"
echo "✅ SELLER LOGIN FIX COMPLETE"
echo "================================================"
echo ""
echo "Credentials for Testing:"
echo "Email: maryam.zaidi2904@gmail.com"
echo "Password: Maryam@123456"
echo ""

