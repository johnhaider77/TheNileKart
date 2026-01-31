#!/bin/bash

# Generate iOS App Icons
ICON_DIR="/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/ios-app/TheNileKartApp/Assets.xcassets/AppIcon.appiconset"
SOURCE="/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/frontend/public/logo512.png"

cd "$ICON_DIR"

echo "🎨 Generating iOS app icons..."

# iPhone App Icons
sips -z 120 120 "$SOURCE" --out "Icon-60@2x.png"
sips -z 180 180 "$SOURCE" --out "Icon-60@3x.png"

# iPhone Spotlight Icons
sips -z 80 80 "$SOURCE" --out "Icon-40@2x.png"
sips -z 120 120 "$SOURCE" --out "Icon-40@3x.png"

# iPhone Settings Icons
sips -z 58 58 "$SOURCE" --out "Icon-29@2x.png"
sips -z 87 87 "$SOURCE" --out "Icon-29@3x.png"

# iPad App Icon
sips -z 152 152 "$SOURCE" --out "Icon-76@2x.png"
sips -z 76 76 "$SOURCE" --out "Icon-76.png"

# iPad Pro App Icon
sips -z 167 167 "$SOURCE" --out "Icon-83.5@2x.png"

# iPad Spotlight Icon
sips -z 40 40 "$SOURCE" --out "Icon-20@2x.png"
sips -z 40 40 "$SOURCE" --out "Icon-40.png"

# App Store Icon
sips -z 1024 1024 "$SOURCE" --out "Icon-1024.png"

echo "✅ All icons generated!"
ls -lh "$ICON_DIR"/Icon-*.png | wc -l && echo "icon files created"
