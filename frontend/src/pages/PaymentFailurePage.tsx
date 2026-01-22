import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMetrics } from '../hooks/useMetrics';
import '../styles/PaymentErrorPage.css';

const PaymentFailurePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  // Use metrics with page tracking disabled to prevent session interference
  const { trackPaymentError } = useMetrics({ pageType: 'payment_failure', trackPageViews: false });

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    
    console.log('Payment Failed:', { orderId });
    
    // Track the payment failure
    if (trackPaymentError) {
      try {
        trackPaymentError({
          errorCode: 'PAYMENT_FAILED',
          errorMessage: 'Payment was declined by the payment gateway',
          errorDetails: { orderId }
        });
      } catch (error) {
        console.error('Error tracking payment error:', error);
      }
    }

    setLoading(false);
  }, [searchParams, trackPaymentError]);

  const handleRetryPayment = () => {
    navigate('/checkout');
  };

  const handleBackToCart = () => {
    navigate('/cart');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="payment-error-loading">
        <div className="loading-spinner">Processing...</div>
      </div>
    );
  }

  const orderId = searchParams.get('orderId');

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

          <div className="error-details">
            <h3>Error Details:</h3>
            <p className="error-message">
              Your payment was declined. This could be due to several reasons including insufficient funds, incorrect payment details, or a temporary issue with your bank.
            </p>
          </div>

          {orderId && (
            <div className="order-info">
              <h3>Order Information:</h3>
              <p>Order ID: {orderId}</p>
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
              className="btn btn-secondary home-button"
            >
              <span className="button-icon">🏠</span>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailurePage;
