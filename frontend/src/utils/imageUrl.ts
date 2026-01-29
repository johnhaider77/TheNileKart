/**
 * Utility function to construct proper image URLs
 * Handles both CloudFront CDN and direct API URLs
 */

export const getImageUrl = (imagePath: string | undefined): string => {
  if (!imagePath) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop';
  }

  // If it's already a full URL (http/https), return as-is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  // Use CloudFront CDN for images if environment variable is set
  const cdnUrl = process.env.REACT_APP_CDN_IMAGES_URL;
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

  // Use CloudFront CDN if available
  const cdnUrl = process.env.REACT_APP_CDN_IMAGES_URL;
  if (cdnUrl) {
    if (imagePath.startsWith('/')) {
      return `${cdnUrl}${imagePath}`;
    } else {
      return `${cdnUrl}/${imagePath}`;
    }
  }

  // Fallback to API
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  if (imagePath.startsWith('/')) {
    return `${apiUrl}${imagePath}`;
  } else {
    return `${apiUrl}/${imagePath}`;
  }
};
