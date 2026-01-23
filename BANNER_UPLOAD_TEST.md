# Banner Image Upload with Custom Name - Test Guide

## What Was Fixed

The banner image upload system now properly uses the custom imageName provided by the user, instead of using an auto-generated timestamp-based filename. Previously, when you:

1. Selected a new image (imageName field auto-populated with filename)
2. Edited the imageName field with a custom name like "LaunchBonanza.jpeg"
3. Submitted the form

The image would upload to S3 with the auto-generated name instead of your custom name.

**Now**, when you provide a custom imageName, the file is:
1. Uploaded to S3 with a temporary timestamp-based name (by multer)
2. Renamed to use your custom name (copy + delete operation)
3. Stored in the database with the custom name
4. Displayed correctly with your custom name in the S3 bucket

## Testing Steps

### Step 1: Open the Seller Portal
- Go to your seller dashboard
- Navigate to Banners Management

### Step 2: Create or Edit a Banner
- Click "Create New Banner" or edit an existing banner
- A modal will open

### Step 3: Select an Image and Edit the Name
- Click on the "Background Image" file input
- Select an image file (e.g., "product-promo.png")
- Notice the "Image Name" field appears below with the filename
- **Edit the Image Name** to something custom (e.g., "LaunchBonanza.jpeg" or "summer-mega-sale.jpg")
- Keep the other fields populated (title, subtitle, offer selection, etc.)

### Step 4: Submit the Form
- Click "Save Banner"
- Watch for the success message to appear

### Step 5: Check the Browser Console (Developer Tools)
Open DevTools (F12 or Cmd+Option+I) and look in the Console tab for:

```
🖼️ Image selected: { fileName: "product-promo.png", size: 12345 }
📝 imageName field changed: { oldValue: "product-promo.png", newValue: "LaunchBonanza.jpeg", ... }
📝 Banner imageName being sent: LaunchBonanza.jpeg
🔍 Banner form state before submit: { hasImage: true, imageName: "LaunchBonanza.jpeg", ... }
```

### Step 6: Check the Backend Logs (On EC2)
SSH into the EC2 instance and check the backend logs:

```bash
ssh ubuntu@40.172.190.250
pm2 logs TheNileKart
```

Look for logs like:
```
🔵 Banner PUT request received: { ... imageName: "LaunchBonanza.jpeg" ... }
🔄 Renaming S3 file for custom imageName: { oldKey: "banners/1769138947068-product-promo.png", newKey: "banners/LaunchBonanza.jpeg" ... }
✅ S3 file renamed successfully: { newUrl: "https://thenilekart-images-prod.s3.me-central-1.amazonaws.com/banners/LaunchBonanza.jpeg" }
📸 New S3 file uploaded: { location: "https://...LaunchBonanza.jpeg", usedImageName: "YES (custom)", finalName: "LaunchBonanza.jpeg" }
✅ Banner updated successfully: { bannerId: 123, backgroundImageStored: "{\"url\":\"https://...LaunchBonanza.jpeg\",\"name\":\"LaunchBonanza.jpeg\"}" }
```

### Step 7: Check S3 Bucket
- Log in to AWS Console
- Go to S3 → thenilekart-images-prod bucket
- Navigate to the "banners/" folder
- Verify your custom filename exists (e.g., "LaunchBonanza.jpeg")
- Verify old timestamp-based file is gone

### Step 8: Verify in Seller Portal
- Refresh the banners list
- The banner should appear with the new image
- The image URL should contain your custom filename

## Success Criteria

✅ Image uploads successfully  
✅ Custom imageName appears in S3 bucket filename  
✅ Previous image is deleted from S3 (if updating existing banner)  
✅ Success message appears for 2.5 seconds  
✅ Database stores correct metadata with custom name  
✅ Console shows "YES (custom)" for usedImageName  

## If Issues Occur

### Issue: Custom name not being used
1. Check browser console for imageName logging
2. Check backend logs for "imageName being sent"
3. Make sure imageName field is visible (appears after file selection)
4. Clear browser cache and try again

### Issue: S3 file not renamed
1. Check backend logs for "Renaming S3 file for custom imageName"
2. Check logs for any error messages during rename
3. Check that AWS credentials have S3 copy/delete permissions

### Issue: Previous image not deleted
1. The old deletion now happens before upload, so this should not occur
2. Check backend logs for "Could not delete old S3 file"
3. Verify IAM permissions allow DeleteObject on S3

### Issue: Success message not showing
1. Check for JavaScript errors in browser console
2. Verify API response is successful (check Network tab)
3. Check setTimeout is working (should close modal after 2500ms)

## Related Code Changes

- **Frontend**: `/frontend/src/components/BannerManagement.tsx`
  - Added console logging for imageName field changes
  - Logs imageName state before form submission
  
- **Backend**: `/backend/routes/banners.js`
  - Added S3 file rename logic when imageName provided
  - Added logging for upload and rename process
  
- **S3 Config**: `/backend/config/s3Upload.js`
  - Added `renameS3File()` function for copy + delete operation
  - Exported function for use in routes

## Recent Commits

- **dc60941**: Add comprehensive console logging for imageName debugging
- **776bc96**: Implement S3 file renaming for banner images with custom names
