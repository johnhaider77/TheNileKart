/**
 * Utility function to construct proper image URLs
 * Handles both CloudFront CDN and direct API/S3 URLs with fallback
 * Note: CloudFront CORS may block some requests, so we keep original S3 as fallback
 */

export const getImageUrl = (imagePath: string | undefined): string => {
  if (!imagePath) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop';
  }

  // Check if it's an S3 URL (direct from API)
  if (imagePath.includes('thenilekart-images-prod.s3')) {
    // Return S3 URL as-is for now (CORS issues with CloudFront, keep direct S3 working)
    return imagePath;
  }

  // If it's already a full URL (http/https), return as-is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  // For relative paths, construct proper URL
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

  // If it's already a full URL, return as-is (keep S3 direct links)
  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  // For relative paths, construct proper URL
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  if (imagePath.startsWith('/')) {
    return `${apiUrl}${imagePath}`;
  } else {
    return `${apiUrl}/${imagePath}`;
  }
};
