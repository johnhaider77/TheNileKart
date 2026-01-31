# 🚀 iOS App - Quick Launch Guide

## One-Line Launch (macOS)

```bash
open ios-app/TheNileKartApp.xcodeproj
```

Then in Xcode:
1. Select **TheNileKartApp** scheme
2. Select **iPhone 15 Pro** simulator (or your device)
3. Press **Cmd + R** or click the Play button
4. App launches with TheNileKart website loaded

## What You'll See

✅ Native iOS app interface
✅ TheNileKart website loaded in WebView
✅ Full e-commerce functionality working
✅ Shopping cart, products, checkout all available
✅ Smooth, native iOS experience

## Project Information

- **Location**: `ios-app/TheNileKartApp.xcodeproj`
- **Language**: Swift with SwiftUI
- **Git Branch**: `iosApp`
- **Website URL**: https://www.thenilekart.com
- **iOS Support**: iOS 14.0+

## EC2 Deployment (If Needed for Testing)

**Start services on EC2** (on ports 3002/5002):
```bash
ssh -i ~/.ssh/thenilekart-key2.pem ubuntu@40.172.190.250
cd /home/ubuntu/var/www/thenilekartIOS/TheNileKart
./deploy-ios-services.sh
```

**Update app to use local services**:
- Edit: `ios-app/TheNileKartApp/ContentView.swift`
- Change: `https://www.thenilekart.com` → `http://localhost:3002`
- Rebuild in Xcode (Cmd + B)
- Run (Cmd + R)

## Key Files

| File | Purpose |
|------|---------|
| ios-app/TheNileKartApp.xcodeproj | Xcode project |
| ios-app/TheNileKartApp/ContentView.swift | Main WebView UI |
| ios-app/TheNileKartApp/TheNileKartApp.swift | App entry point |
| iOS_DEPLOYMENT_GUIDE.md | Full documentation |
| iOS_APP_DEPLOYMENT_COMPLETE.md | Deployment summary |

## Troubleshooting

**App won't load website?**
- Check network connection
- Verify https://www.thenilekart.com is accessible
- In Xcode, check Console for errors (Cmd + Shift + C)

**Build fails?**
- Clean build: Cmd + Shift + K
- Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData/TheNileKartApp*`
- Close Xcode and reopen

**Can't find scheme?**
- Close and reopen the .xcodeproj file
- Clean build folder (Cmd + Shift + K)

## Git Commands

```bash
# View iOS app changes
git log --oneline -5

# Sync iOS app to EC2
./sync-ios-to-ec2.sh 40.172.190.250

# Push changes to iosApp branch
git push origin iosApp

# Check current branch
git branch
```

## More Information

For complete documentation, see:
- [iOS_DEPLOYMENT_GUIDE.md](iOS_DEPLOYMENT_GUIDE.md)
- [iOS_APP_DEPLOYMENT_COMPLETE.md](iOS_APP_DEPLOYMENT_COMPLETE.md)

---

**Status**: ✅ Ready to launch in Xcode
**Last Updated**: January 31, 2026
