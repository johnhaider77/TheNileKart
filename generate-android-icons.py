#!/usr/bin/env python3

import os
from PIL import Image, ImageDraw

# Source image
source_image = "frontend/public/TheNileKart.jpeg"
android_res_dir = "android-app/app/src/main/res"

# Icon sizes for different Android densities
sizes = {
    "mipmap-ldpi": 36,
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

if not os.path.exists(source_image):
    print(f"Error: Source image not found at {source_image}")
    exit(1)

print(f"Generating Android icons from {source_image}...")

# Open source image
source = Image.open(source_image).convert("RGBA")

for dir_name, size in sizes.items():
    # Create directory if it doesn't exist
    output_dir = os.path.join(android_res_dir, dir_name)
    os.makedirs(output_dir, exist_ok=True)
    
    # Resize image
    icon = source.resize((size, size), Image.Resampling.LANCZOS)
    
    # Save regular icon
    icon.save(os.path.join(output_dir, "ic_launcher.png"), "PNG")
    print(f"✅ Generated {size}x{size} icon in {dir_name}")
    
    # Generate round icon with rounded corners
    # Create a circular mask
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    
    # Apply mask to create circular icon
    output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    output.paste(icon, (0, 0))
    output.putalpha(mask)
    
    # Save round icon
    output.save(os.path.join(output_dir, "ic_launcher_round.png"), "PNG")
    print(f"✅ Generated {size}x{size} round icon in {dir_name}")

print("\n✅ All Android icons generated successfully!")
