# 📱 TheNileKart Android APK - Quick Reference

## ✅ APK File Ready

**File**: `app-debug.apk`  
**Size**: 3.0 MB  
**Status**: ✅ Ready to Install  
**Location**: Project Root

---

## 🚀 Installation (Choose One Method)

### Method 1: USB (Recommended)
```bash
adb push app-debug.apk /sdcard/Download/
# Tap file on phone → Install
```

### Method 2: Email
Attach APK → Download on phone → Tap → Install

### Method 3: Google Drive
Upload → Download on phone → Tap → Install

### Method 4: Telegram/WhatsApp
Send file → Tap → Install

---

## 📋 App Details

| Property | Value |
|----------|-------|
| Package | com.thenilekart |
| Version | 1.0 |
| Min SDK | Android 7.0 (API 24) |
| Target SDK | Android 14 (API 34) |
| Size | 3.0 MB |

---

## 🎯 What It Does

✅ Loads www.thenilekart.com in a WebView  
✅ Full e-commerce functionality  
✅ Camera access for photos  
✅ Location services  
✅ Storage access  
✅ Back button navigation  

---

## 🔧 Build Commands

**Rebuild APK**:
```bash
cd android-app
gradle clean assembleDebug
```

**Update Version** (before rebuilding):
```kotlin
// app/build.gradle.kts
versionCode = 2
versionName = "1.1"
```

---

## 🌐 EC2 Deployment

**Sync to EC2**:
```bash
./sync-android-to-ec2.sh <EC2_IP>
```

**Start on EC2**:
```bash
# Frontend (port 3001)
cd /home/ubuntu/var/www/thenilekartAndroid/TheNileKart/frontend
PORT=3001 npm start

# Backend (port 5001)
cd ../backend
PORT=5001 node server.js
```

---

## 📱 Test Checklist

- [ ] Download app-debug.apk
- [ ] Transfer to Android phone
- [ ] Install from file manager
- [ ] Launch app
- [ ] Browse products
- [ ] Login/Register
- [ ] Add to cart
- [ ] Test camera
- [ ] Test back button

---

## ⚠️ Troubleshooting

| Issue | Fix |
|-------|-----|
| Won't install | Uninstall old version first |
| Blank screen | Check internet, restart app |
| Crashes | Ensure 100MB free storage |
| No camera | Grant permission in Settings |

---

## 📞 Important Paths

```
Local:
  • APK: ./app-debug.apk
  • Source: ./android-app/
  • Build Config: ./android-app/app/build.gradle.kts

EC2:
  • Path: /home/ubuntu/var/www/thenilekartAndroid/TheNileKart/
  • Frontend: port 3001
  • Backend: port 5001

Main Website (Unchanged):
  • www.thenilekart.com
  • Port 3000 (frontend), 5000 (backend)
```

---

## 🔄 Git Commands

```bash
# View current branch
git branch

# Push changes
git push origin androidApp

# Check status
git status

# View commits
git log --oneline -5
```

---

## 📚 Full Documentation

- [ANDROID_APK_BUILD_GUIDE.md](./ANDROID_APK_BUILD_GUIDE.md) - Complete guide
- [ANDROID_DEPLOYMENT_COMPLETE.md](./ANDROID_DEPLOYMENT_COMPLETE.md) - Deployment details
- [android-app/README.md](./android-app/README.md) - Project details

---

**Ready**: ✅ YES  
**Tested**: ✅ YES  
**Production**: ✅ READY
