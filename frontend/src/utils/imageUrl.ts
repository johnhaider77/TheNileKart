/**
 * Utility function to construct proper image URLs
 * Handles both CloudFront CDN and direct API/S3 URLs
 */

export const getImageUrl = (imagePath: string | undefined): string => {
  if (!imagePath) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop';
  }

  // Use CloudFront CDN for images - always use CDN URL
  const cdnUrl = process.env.REACT_APP_CDN_IMAGES_URL || 'https://dmfx2utixco0d.cloudfront.net';
  
  // Check if it's an S3 URL (direct from API)
  if (imagePath.includes('thenilekart-images-prod.s3')) {
    // Extract the path from S3 URL
    // e.g., https://thenilekart-images-prod.s3.me-central-1.amazonaws.com/products/IMG_2718.jpeg
    // becomes /products/IMG_2718.jpeg
    const s3UrlPattern = /https?:\/\/thenilekart-images-prod\.s3[^/]*\.amazonaws\.com(\/.*)/;
    const match = imagePath.match(s3UrlPattern);
    
    if (match && match[1]) {
      const s3Path = match[1];
      
      // Route through CloudFront if available
      if (cdnUrl) {
        return `${cdnUrl}${s3Path}`;
      }
      // Fallback to direct S3 URL if CloudFront not available
      return imagePath;
    }
  }

  // If it's already a full URL (http/https), return as-is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  // For relative paths, use CloudFront CDN if available
  if (cdnUrl) {
    // Images from S3 are served via CloudFront
    // They may start with /uploads or just the filename
    if (imagePath.startsWith('/')) {
      return `${cdnUrl}${imagePath}`;
    } else {
      return `${cdnUrl}/${imagePath}`;
    }
  }

  // Fallback to API URL
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  if (imagePath.startsWith('/')) {
    return `${apiUrl}${imagePath}`;
  } else {
    return `${apiUrl}/${imagePath}`;
  }
};

export const getBannerImageUrl = (imagePath: string | undefined): string => {
  if (!imagePath) {
    return '';
  }

  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  // Use CloudFront CDN - always use CDN URL
  const cdnUrl = process.env.REACT_APP_CDN_IMAGES_URL || 'https://dmfx2utixco0d.cloudfront.net';
  if (imagePath.startsWith('/')) {
    return `${cdnUrl}${imagePath}`;
  } else {
    return `${cdnUrl}/${imagePath}`;
  }
};
