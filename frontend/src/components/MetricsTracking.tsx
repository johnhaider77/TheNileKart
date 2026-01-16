import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useMetrics } from '../hooks/useMetrics';

interface WithMetricsTrackingProps {
  pageType?: string;
  pageIdentifier?: string;
  disableAutoTracking?: boolean;
}

// HOC to add metrics tracking to any component
export function withMetricsTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithMetricsTrackingProps = {}
) {
  const ComponentWithMetrics = (props: P) => {
    const { pageType, pageIdentifier, disableAutoTracking = false } = options;
    
    // Use the metrics hook with auto-tracking unless disabled
    useMetrics({
      trackPageViews: !disableAutoTracking,
      pageType,
      pageIdentifier
    });

    return <WrappedComponent {...props} />;
  };

  // Set display name for better debugging
  ComponentWithMetrics.displayName = `withMetricsTracking(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ComponentWithMetrics;
}

// Specific HOCs for different page types
export const withHomePageTracking = <P extends object>(Component: React.ComponentType<P>) =>
  withMetricsTracking(Component, { pageType: 'homepage' });

export const withCategoryPageTracking = <P extends object>(
  Component: React.ComponentType<P>,
  categoryName?: string
) =>
  withMetricsTracking(Component, { 
    pageType: 'category', 
    pageIdentifier: categoryName 
  });

export const withOfferPageTracking = <P extends object>(
  Component: React.ComponentType<P>,
  offerId?: string
) =>
  withMetricsTracking(Component, { 
    pageType: 'offer', 
    pageIdentifier: offerId 
  });

export const withCheckoutPageTracking = <P extends object>(Component: React.ComponentType<P>) =>
  withMetricsTracking(Component, { pageType: 'checkout' });

export const withPaymentPageTracking = <P extends object>(Component: React.ComponentType<P>) =>
  withMetricsTracking(Component, { pageType: 'payment' });

export const withPaymentErrorPageTracking = <P extends object>(Component: React.ComponentType<P>) =>
  withMetricsTracking(Component, { pageType: 'payment_error' });

// Component to manually track page views without HOC
export const MetricsTracker: React.FC<WithMetricsTrackingProps> = ({ 
  pageType, 
  pageIdentifier, 
  disableAutoTracking = false 
}) => {
  useMetrics({
    trackPageViews: !disableAutoTracking,
    pageType,
    pageIdentifier
  });

  return null; // This component doesn't render anything
};

export default withMetricsTracking;