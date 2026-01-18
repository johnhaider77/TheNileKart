import React, { useState, useEffect } from 'react';
import PayPalButton from './PayPalButton';
import PaymentErrorBoundary from './PaymentErrorBoundary';
import '../styles/PaymentOptions.css';

interface PaymentOptionsProps {
  amount: number;
  items: any[];
  shippingAddress: any;
  onPaymentSuccess: (details: any, data: any) => void;
  onPaymentError: (error: any) => void;
  onCODOrder: () => void;
  disabled?: boolean;
  codDetails?: {
    eligible: boolean;
    fee: number;
    nonEligibleItems: any[];
  };
  onBackToCart?: () => void;
}

const PaymentOptions: React.FC<PaymentOptionsProps> = ({
  amount,
  items,
  shippingAddress,
  onPaymentSuccess,
  onPaymentError,
  onCODOrder,
  disabled = false,
  codDetails,
  onBackToCart
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cod' | 'paypal'>('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Auto-select paypal if COD is not available
  useEffect(() => {
    if (codDetails && !codDetails.eligible) {
      setSelectedPaymentMethod('paypal');
    }
  }, [codDetails]);
  
  // Mobile detection for enhanced UX
  const isMobile = () => {
    const ua = navigator.userAgent;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isMobileScreen = window.innerWidth <= 768;
    const hasTouch = 'ontouchstart' in window;
    return isMobileUA || (isMobileScreen && hasTouch);
  };

  const handlePaymentMethodChange = (method: 'cod' | 'paypal') => {
    setSelectedPaymentMethod(method);
  };

  const handleCODOrder = async () => {
    setIsProcessing(true);
    try {
      await onCODOrder();
    } catch (error) {
      onPaymentError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayPalSuccess = (details: any, data: any) => {
    setIsProcessing(false);
    onPaymentSuccess(details, data);
  };

  const handlePayPalError = (error: any) => {
    setIsProcessing(false);
    onPaymentError(error);
  };

  return (
    <div className="payment-options">
      <h3>Choose Payment Method</h3>
      
      {/* Mobile-specific helper text */}
      {isMobile() && (
        <div style={{
          background: '#e3f2fd',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          color: '#1565c0',
          textAlign: 'center'
        }}>
          📱 <strong>Mobile Tip:</strong> Cash on Delivery is recommended for the smoothest mobile experience
        </div>
      )}
      
      {/* Payment Method Selection */}
      <div className="payment-methods">
        {/* Cash on Delivery */}
        <div className={`payment-method-card ${selectedPaymentMethod === 'cod' ? 'selected' : ''} ${codDetails && !codDetails.eligible ? 'disabled' : ''}`}>
          <div className="payment-method-header">
            <input
              type="radio"
              id="cod"
              name="paymentMethod"
              value="cod"
              checked={selectedPaymentMethod === 'cod'}
              onChange={() => handlePaymentMethodChange('cod')}
              disabled={disabled || (codDetails && !codDetails.eligible)}
            />
            <label htmlFor="cod" className="payment-method-label">
              <div className="payment-method-title">
                <span className="payment-icon">💵</span>
                <span>Cash on Delivery (COD)</span>
                {codDetails && codDetails.fee > 0 && (
                  <span className="cod-fee-badge">+{codDetails.fee} AED fee</span>
                )}
                {codDetails && codDetails.fee === 0 && amount >= 100 && (
                  <span className="cod-free-badge">FREE</span>
                )}
              </div>
              <p className="payment-method-description">
                {codDetails && !codDetails.eligible ? 
                  'Some items are not available for Cash on Delivery' :
                  'Pay when your order is delivered to your doorstep'
                }
              </p>
            </label>
          </div>
          
          {selectedPaymentMethod === 'cod' && (
            <div className="payment-method-content">
              <div className="cod-info">
                <ul>
                  <li>No advance payment required</li>
                  <li>Pay the exact amount to our delivery partner</li>
                  <li>Cash payment only (no cards accepted at delivery)</li>
                  <li>Order will be processed immediately</li>
                  {codDetails && codDetails.fee > 0 && (
                    <li>COD fee: {codDetails.fee} AED (5% of order value, max 10 AED)</li>
                  )}
                  {codDetails && codDetails.fee === 0 && amount >= 100 && (
                    <li>✅ Free COD for orders above 100 AED</li>
                  )}
                </ul>
              </div>
              
              <button
                className="payment-submit-btn cod-btn"
                onClick={handleCODOrder}
                disabled={disabled || isProcessing || (codDetails && !codDetails.eligible)}
              >
                {isProcessing ? 'Placing Order...' : `Place Order (COD${codDetails && codDetails.fee > 0 ? ` +${codDetails.fee} AED` : ''})`}
              </button>
            </div>
          )}
        </div>

        {/* PayPal Payment */}
        <div className={`payment-method-card ${selectedPaymentMethod === 'paypal' ? 'selected' : ''}`}>
          <div className="payment-method-header">
            <input
              type="radio"
              id="paypal-radio"
              name="paymentMethod"
              value="paypal"
              checked={selectedPaymentMethod === 'paypal'}
              onChange={() => handlePaymentMethodChange('paypal')}
              disabled={disabled}
            />
            <label htmlFor="paypal-radio" className="payment-method-label">
              <div className="payment-method-title">
                <span className="payment-icon">💳</span>
                <span>Pay Online</span>
              </div>
            </label>
          </div>
          
          {selectedPaymentMethod === 'paypal' && (
            <div className="payment-method-content">
              <div className="paypal-button-wrapper">
                <PaymentErrorBoundary
                  onError={(error: Error) => {
                    console.error('PayPal component error:', error);
                    handlePayPalError(error);
                  }}
                >
                  <PayPalButton
                    key={`paypal-${amount}-${items.length}`}
                    amount={amount}
                    items={items}
                    shippingAddress={shippingAddress}
                    onSuccess={handlePayPalSuccess}
                    onError={handlePayPalError}
                    disabled={disabled || isProcessing}
                  />
                </PaymentErrorBoundary>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Order Summary */}
      <div className="payment-summary">
        <div className="summary-row">
          <span>Order Total:</span>
          <span className="amount">${amount.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Payment Method:</span>
          <span className="method">
            {selectedPaymentMethod === 'cod' ? 'Cash on Delivery' : 'Secure PayPal Payment'}
          </span>
        </div>
      </div>
      
      {/* Security Notice */}
      <div className="security-notice">
        <p>🔒 Your payment information is secure and encrypted</p>
        <p>📧 Order confirmation will be sent to your email</p>
      </div>
    </div>
  );
};

export default PaymentOptions;