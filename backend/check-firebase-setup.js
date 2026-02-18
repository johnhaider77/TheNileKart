#!/usr/bin/env node

/**
 * Firebase Setup Checker
 * This script diagnoses Firebase Cloud Messaging configuration
 * Run with: node check-firebase-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n=== Firebase Configuration Checker ===\n');

const checks = [];

// Check 1: Environment variable
console.log('📋 Check 1: FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
const envVarSet = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (envVarSet) {
  console.log('✅ Environment variable is set');
  try {
    const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    console.log('   Project ID:', key.project_id);
    console.log('   Client Email:', key.client_email);
    console.log('   Key Type:', key.type);
    checks.push(true);
  } catch (e) {
    console.log('❌ Environment variable is NOT valid JSON');
    console.log('   Error:', e.message);
    checks.push(false);
  }
} else {
  console.log('❌ Environment variable NOT set');
  checks.push(false);
}

// Check 2: Service account file
console.log('\n📋 Check 2: firebase-service-account-key.json file');
const keyPath = path.join(__dirname, '../firebase-service-account-key.json');
const fileExists = fs.existsSync(keyPath);
if (fileExists) {
  console.log('✅ File exists at:', keyPath);
  try {
    const key = require(keyPath);
    console.log('   Project ID:', key.project_id);
    console.log('   Client Email:', key.client_email);
    console.log('   Key Type:', key.type);
    checks.push(true);
  } catch (e) {
    console.log('❌ File exists but is NOT valid JSON');
    console.log('   Error:', e.message);
    checks.push(false);
  }
} else {
  console.log('❌ File does NOT exist at:', keyPath);
  checks.push(false);
}

// Check 3: Overall status
console.log('\n=== Summary ===\n');
const allChecks = checks.some(c => c);

if (allChecks) {
  console.log('✅ Firebase is configured!');
  console.log('   Push notifications should work.');
} else {
  console.log('❌ Firebase is NOT configured!');
  console.log('\n📝 To fix:');
  console.log('   1. Download firebase-service-account-key.json from Google Cloud Console');
  console.log('      https://console.cloud.google.com/iam-admin/serviceaccounts');
  console.log('   2. Either:');
  console.log('      A) Place in project root: firebase-service-account-key.json');
  console.log('      B) Set environment variable: export FIREBASE_SERVICE_ACCOUNT_KEY=\'{"type":"service_account",...}\'');
  console.log('   3. Restart the backend service');
}

console.log('\n=== Environment Variables ===\n');
console.log('Node Environment:', process.env.NODE_ENV || 'not set');
console.log('Firebase Service Account Key:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? '🔒 SET' : '❌ NOT SET');
console.log('MongoDB URI:', process.env.MONGODB_URI ? '🔒 SET' : '❌ NOT SET');
console.log('JWT Secret:', process.env.JWT_SECRET ? '🔒 SET' : '❌ NOT SET');

console.log('\n=== Next Steps ===\n');
if (!allChecks) {
  console.log('Run after configuring Firebase:');
  console.log('  npm start  # Start backend');
  console.log('  curl http://localhost:5000/api/push-notifications/firebase-status');
} else {
  console.log('Firebase is ready! Test with:');
  console.log('  curl http://localhost:5000/api/push-notifications/firebase-status');
}

console.log('\n');
process.exit(allChecks ? 0 : 1);
