import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMetrics } from '../hooks/useMetrics';
import '../styles/PaymentErrorPage.css';

interface PaymentErrorState {
  errorCode?: string;
  errorMessage?: string;
  orderId?: string;
  totalAmount?: number;
  paymentMethod?: string;
}

const PaymentErrorPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [errorDetails, setErrorDetails] = useState<PaymentErrorState | null>(null);

  // Initialize metrics tracking for payment error page
  const { trackPaymentErrorPage, trackPaymentError } = useMetrics({ pageType: 'payment_error' });

  useEffect(() => {
    const state = location.state as PaymentErrorState;
    if (state) {
      setErrorDetails(state);
      
      // Track the payment error
      trackPaymentError({
        errorCode: state.errorCode || 'PAYMENT_PAGE_ERROR',
        errorMessage: state.errorMessage || 'Payment failed',
        errorDetails: state
      });
    } else {
      // If no error details, redirect to home
      navigate('/', { replace: true });
    }
  }, [location.state, navigate, trackPaymentError]);

  const handleRetryPayment = () => {
    navigate('/checkout', { state: { fromError: true } });
  };

  const handleBackToCart = () => {
    navigate('/cart');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (!errorDetails) {
    return (
      <div className="payment-error-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="payment-error-page">
      <div className="payment-error-container">
        <div className="error-icon">
          <div className="error-circle">
            <div className="error-x">
              <span>✕</span>
            </div>
          </div>
        </div>

        <div className="error-content">
          <h1 className="error-title">Payment Failed</h1>
          <p className="error-subtitle">
            We couldn't process your payment. Don't worry, no money has been charged.
          </p>

          {errorDetails.errorMessage && (
            <div className="error-details">
              <h3>Error Details:</h3>
              <p className="error-message">{errorDetails.errorMessage}</p>
              {errorDetails.errorCode && (
                <p className="error-code">Error Code: {errorDetails.errorCode}</p>
              )}
            </div>
          )}

          {errorDetails.orderId && (
            <div className="order-info">
              <h3>Order Information:</h3>
              <p>Order ID: {errorDetails.orderId}</p>
              {errorDetails.totalAmount && (
                <p>Amount: ${errorDetails.totalAmount.toFixed(2)}</p>
              )}
              {errorDetails.paymentMethod && (
                <p>Payment Method: {errorDetails.paymentMethod}</p>
              )}
            </div>
          )}

          <div className="common-issues">
            <h3>Common Issues & Solutions:</h3>
            <ul>
              <li>
                <strong>Insufficient Funds:</strong> Check your account balance or try a different payment method.
              </li>
              <li>
                <strong>Card Declined:</strong> Contact your bank or try another card.
              </li>
              <li>
                <strong>Network Issues:</strong> Check your internet connection and try again.
              </li>
              <li>
                <strong>Card Information:</strong> Double-check your card number, expiry date, and CVV.
              </li>
              <li>
                <strong>Payment Limits:</strong> You may have reached your daily payment limit.
              </li>
            </ul>
          </div>

          <div className="action-buttons">
            <button 
              onClick={handleRetryPayment} 
              className="btn btn-primary retry-button"
            >
              <span className="button-icon">🔄</span>
              Try Payment Again
            </button>
            <button 
              onClick={handleBackToCart} 
              className="btn btn-secondary cart-button"
            >
              <span className="button-icon">🛒</span>
              Back to Cart
            </button>
            <button 
              onClick={handleBackToHome} 
              className="btn btn-outline home-button"
            >
              <span className="button-icon">🏠</span>
              Continue Shopping
            </button>
          </div>

          <div className="help-section">
            <h3>Need Help?</h3>
            <p>
              If you continue to experience issues, please contact our support team:
            </p>
            <div className="contact-options">
              <a href="mailto:support@thenilekart.com" className="contact-link">
                📧 support@thenilekart.com
              </a>
              <a href="tel:+1-800-123-4567" className="contact-link">
                📞 +1 (800) 123-4567
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentErrorPage;