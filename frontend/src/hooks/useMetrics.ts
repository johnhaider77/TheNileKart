import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import metricsService from '../services/metricsService';

interface UseMetricsOptions {
  trackPageViews?: boolean;
  pageType?: string;
  pageIdentifier?: string;
}

export const useMetrics = (options: UseMetricsOptions = {}) => {
  const location = useLocation();
  const { trackPageViews = true, pageType, pageIdentifier } = options;

  useEffect(() => {
    if (trackPageViews) {
      // Auto-detect page type based on route if not provided
      const detectedPageType = pageType || detectPageType(location.pathname);
      const detectedIdentifier = pageIdentifier || extractPageIdentifier(location.pathname, location.search);

      // Track the page visit
      metricsService.trackPageVisit({
        pageType: detectedPageType,
        pageIdentifier: detectedIdentifier,
        pageUrl: `${location.pathname}${location.search}`
      });
    }
  }, [location, trackPageViews, pageType, pageIdentifier]);

  return {
    // Direct access to metrics service methods
    trackCheckoutStart: metricsService.trackCheckoutStart.bind(metricsService),
    trackPaymentStart: metricsService.trackPaymentStart.bind(metricsService),
    trackPaymentError: metricsService.trackPaymentError.bind(metricsService),
    trackPaymentSuccess: metricsService.trackPaymentSuccess.bind(metricsService),
    getSessionId: metricsService.getSessionId.bind(metricsService),
    
    // Convenience methods
    trackHomePage: metricsService.trackHomePage.bind(metricsService),
    trackCategoryPage: metricsService.trackCategoryPage.bind(metricsService),
    trackOfferPage: metricsService.trackOfferPage.bind(metricsService),
    trackCheckoutPage: metricsService.trackCheckoutPage.bind(metricsService),
    trackPaymentPage: metricsService.trackPaymentPage.bind(metricsService),
    trackPaymentErrorPage: metricsService.trackPaymentErrorPage.bind(metricsService)
  };
};

// Helper function to detect page type from pathname
function detectPageType(pathname: string): string {
  if (pathname === '/' || pathname === '/home') {
    return 'homepage';
  } else if (pathname.startsWith('/category/') || pathname.startsWith('/categories/')) {
    return 'category';
  } else if (pathname.startsWith('/offer/') || pathname.startsWith('/offers/')) {
    return 'offer';
  } else if (pathname.includes('/checkout')) {
    return 'checkout';
  } else if (pathname.includes('/payment')) {
    if (pathname.includes('/error') || pathname.includes('/failed')) {
      return 'payment_error';
    }
    return 'payment';
  } else if (pathname.startsWith('/product/')) {
    return 'product';
  } else if (pathname.startsWith('/search')) {
    return 'search';
  } else {
    return 'other';
  }
}

// Helper function to extract page identifier from pathname and search params
function extractPageIdentifier(pathname: string, search: string): string | undefined {
  // Extract category name from /category/electronics or /categories/electronics
  if (pathname.startsWith('/category/') || pathname.startsWith('/categories/')) {
    return pathname.split('/')[2];
  }
  
  // Extract offer ID from /offer/123 or /offers/summer-sale
  if (pathname.startsWith('/offer/') || pathname.startsWith('/offers/')) {
    return pathname.split('/')[2];
  }
  
  // Extract product ID from /product/123
  if (pathname.startsWith('/product/')) {
    return pathname.split('/')[2];
  }
  
  // Extract search terms from query parameters
  if (pathname.startsWith('/search')) {
    const params = new URLSearchParams(search);
    return params.get('q') || params.get('query') || 'unknown';
  }
  
  return undefined;
}

export default useMetrics;