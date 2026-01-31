#!/bin/bash

# Generate iOS App Icons from website logo
# This script creates various iOS app icon sizes from the website logo

SOURCE_LOGO="/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/frontend/public/logo512.png"
IOS_ICONS_DIR="/Users/johnhaider/YAM/JnM❤️/CodeRepos/thenilekart/TheNileKart/ios-app/TheNileKartApp/Assets.xcassets/AppIcon.appiconset"

echo "🎨 Generating iOS app icons from website logo..."

# Check if source logo exists
if [ ! -f "$SOURCE_LOGO" ]; then
    echo "❌ Source logo not found: $SOURCE_LOGO"
    exit 1
fi

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "⚠️  ImageMagick not found. Installing via Homebrew..."
    brew install imagemagick
fi

# Create required icon sizes for iOS
SIZES=(
    "20"    # iPhone Notification (2x, 3x)
    "29"    # iPhone Spotlight (2x, 3x)
    "40"    # iPhone App (2x, 3x)
    "60"    # iPhone App (2x, 3x)
    "76"    # iPad App (1x, 2x)
    "83.5"  # iPad Pro App (2x)
    "1024"  # App Store
)

for size in "${SIZES[@]}"; do
    # iPhone 2x
    if [ "$size" != "83.5" ]; then
        output_2x="${IOS_ICONS_DIR}/icon_${size}x${size}@2x.png"
        actual_size_2x=$((size * 2))
        convert "$SOURCE_LOGO" -resize "${actual_size_2x}x${actual_size_2x}" "$output_2x"
        echo "✅ Created ${actual_size_2x}x${actual_size_2x} icon"
    fi
    
    # iPhone 3x
    if [ "$size" != "83.5" ] && [ "$size" != "76" ]; then
        output_3x="${IOS_ICONS_DIR}/icon_${size}x${size}@3x.png"
        actual_size_3x=$((size * 3))
        convert "$SOURCE_LOGO" -resize "${actual_size_3x}x${actual_size_3x}" "$output_3x"
        echo "✅ Created ${actual_size_3x}x${actual_size_3x} icon"
    fi
done

echo "✅ iOS app icons generated successfully!"
