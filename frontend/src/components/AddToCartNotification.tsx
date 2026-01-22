import React, { useEffect, useState } from 'react';
import './AddToCartNotification.css';

interface AddToCartNotificationProps {
  isVisible: boolean;
  onHide: () => void;
}

const AddToCartNotification: React.FC<AddToCartNotificationProps> = ({ isVisible, onHide }) => {
  useEffect(() => {
    if (isVisible) {
      // Auto-hide after 2 seconds (2000ms) to match animation duration
      const timer = setTimeout(() => {
        onHide();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div className="add-to-cart-notification">
      <div className="notification-content">
        <span className="notification-icon">✓</span>
        <span className="notification-text">Added to cart</span>
      </div>
    </div>
  );
};

export default AddToCartNotification;
