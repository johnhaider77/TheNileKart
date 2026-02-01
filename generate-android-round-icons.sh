#!/bin/bash

SOURCE_IMAGE="frontend/public/TheNileKart.jpeg"
ANDROID_RES_DIR="android-app/app/src/main/res"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Error: Source image not found at $SOURCE_IMAGE"
    exit 1
fi

# Install ImageMagick if not available
if ! command -v convert &> /dev/null; then
    echo "Installing ImageMagick..."
    brew install imagemagick
fi

# Define sizes for round icons
declare -A sizes=(
    ["mipmap-ldpi"]="36"
    ["mipmap-mdpi"]="48"
    ["mipmap-hdpi"]="72"
    ["mipmap-xhdpi"]="96"
    ["mipmap-xxhdpi"]="144"
    ["mipmap-xxxhdpi"]="192"
)

echo "Generating round Android icons from $SOURCE_IMAGE..."

for dir in "${!sizes[@]}"; do
    size=${sizes[$dir]}
    output_dir="$ANDROID_RES_DIR/$dir"
    
    # Create directory if it doesn't exist
    mkdir -p "$output_dir"
    
    # Generate icon with rounded corners
    convert "$SOU#!/bin/bash

SOURCE_IMAGE="frontend/public/TheNileKart.jpeg"
ANDROID_RES_DIR="android-app/app/src/main/res"

# Check if 0 
SOURCE_IM\( ANDROID_RES_DIR="android-app/app/src/raw 'fill b
# Check if source image exists
if [ ! -f "$Ssizif [ ! -f "$SOURCE_IMAGE" ]; -f    echo "Error: Source image noit    exit 1
fi

# Install ImageMagick if not availly -compofi

# Ins      if ! command -v convert &> /dev/null;om    echo "Installing ImageMagick..."
    au    brew install imagemagick
fi

#  Gfi

# Define sizes for round 
condeclare -A sizes=(
    ["mipmra    ["mlar icons to    ["mipmap-mdpi"]="48ec    [
echo "Regenerating     ["mipmap-xhdpi"]="9di    ["mipmap-xxhdpi"]="1      ["mipmap-xxxhdpi"]="19ou)

echo "Generating round A$dir"
for dir in "${!sizes[@]}"; do
    size=${sizes[$dir]}
   ard icon
    convert "$SOURCE_IMA    output_dir="$ANDRO"$   ze}x${size}" \
        -strip \
        "    mkdir -p "$output_dir"
    
    # Geno     
    # Gener $size x $s    i    convert "$SOU#!/bin/bashcho "✅ All 
SOURCE_IMAGs generated successfully!"
