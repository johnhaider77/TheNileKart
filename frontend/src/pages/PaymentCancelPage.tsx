import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMetrics } from '../hooks/useMetrics';
import '../styles/PaymentErrorPage.css';

const PaymentCancelPage: React.FC = () => {
  console.log('🔴 PaymentCancelPage component rendered!');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  const { trackPaymentError } = useMetrics({ pageType: 'payment_cancel' });

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    
    console.log('🔴 Payment Cancelled:', { orderId });
    
    // Track the payment cancellation
    trackPaymentError({
      errorCode: 'PAYMENT_CANCELLED',
      errorMessage: 'User cancelled the payment',
      errorDetails: { orderId }
    });

    setLoading(false);
  }, [searchParams, trackPaymentError]);

  const handleRetryPayment = () => {
    navigate('/checkout');
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
          <h1 className="error-title">Payment Cancelled</h1>
          <p className="error-subtitle">
            You have cancelled the payment. Your order has not been finalized.
          </p>

          <div className="error-details">
            <h3>What Happened?</h3>
            <p className="error-message">
              No payment has been charged to your account. Your order was not completed because you exited the payment process.
            </p>
          </div>

          {orderId && (
            <div className="order-info">
              <h3>Order Information:</h3>
              <p>Order ID: {orderId}</p>
            </div>
          )}

          <div className="common-issues">
            <h3>Next Steps:</h3>
            <ul>
              <li>Your items remain in your cart</li>
              <li>You can review your cart and try again</li>
              <li>Try a different payment method if needed</li>
              <li>Contact our support if you need assistance</li>
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

export default PaymentCancelPage;
