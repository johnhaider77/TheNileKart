import React, { useEffect, useState } from 'react';
import './AddToCartNotification.css';

interface AddToCartNotificationProps {
  isVisible: boolean;
  onHide: () => void;
}

const AddToCartNotification: React.FC<AddToCartNotificationProps> = ({ isVisible, onHide }) => {
  const [shouldAnimate, setShouldAnimate] = React.useState(false);

  useEffect(() => {
    if (isVisible) {
      // Trigger animation immediately
      setShouldAnimate(true);
      
      // Auto-hide after 2 seconds (2000ms) - increased from 1 second for better UX
      const timer = setTimeout(() => {
        setShouldAnimate(false);
        // Give animation time to complete before calling onHide
        const hideTimer = setTimeout(onHide, 300);
        return () => clearTimeout(hideTimer);
      }, 1700);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div className={`add-to-cart-notification ${shouldAnimate ? 'animate-to-cart' : 'hide'}`}>
      <div className="notification-content">
        <span className="notification-icon">✓</span>
        <span className="notification-text">Added to cart</span>
      </div>
    </div>
  );
};

export default AddToCartNotification;
