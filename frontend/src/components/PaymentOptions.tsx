import React, { useState, useEffect } from 'react';
import ZiinaPayment from './ZiinaPayment';
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
  shippingFeeDetails?: {
    subtotal: number;
    fee: number;
    total: number;
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
  shippingFeeDetails,
  onBackToCart
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cod' | 'ziina'>('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Auto-select ziina if COD is not available
  useEffect(() => {
    if (codDetails && !codDetails.eligible) {
      setSelectedPaymentMethod('ziina');
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

  const handlePaymentMethodChange = (method: 'cod' | 'ziina') => {
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

  const handleZiinaSuccess = (details: any) => {
    setIsProcessing(false);
    onPaymentSuccess(details, {});
  };

  const handleZiinaError = (error: any) => {
    setIsProcessing(false);
    onPaymentError(error);
  };

  return (
    <div className="payment-options">
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
              <div className="payment-method-title cod-title">
                <span className="payment-icon">💵</span>
                <span>Cash on Delivery</span>
              </div>
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
                  {codDetails && codDetails.fee > 0 ? (
                    <li>COD fee: {codDetails.fee} AED (10% of order value, min 5 AED, max 10 AED)</li>
                  ) : null}
                  {codDetails && codDetails.fee === 0 && amount >= 100 ? (
                    <li>✅ Free COD for orders above 100 AED</li>
                  ) : null}
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

        {/* Ziina Online Payment */}
        <div className={`payment-method-card ${selectedPaymentMethod === 'ziina' ? 'selected' : ''} ${amount < 3 ? 'disabled' : ''}`}>
          <div className="payment-method-header">
            <input
              type="radio"
              id="ziina-radio"
              name="paymentMethod"
              value="ziina"
              checked={selectedPaymentMethod === 'ziina'}
              onChange={() => handlePaymentMethodChange('ziina')}
              disabled={disabled || amount < 3}
            />
            <label htmlFor="ziina-radio" className="payment-method-label">
              <div className="payment-method-title pay-online-title">
                <span className="payment-icon">💳</span>
                <span>Pay Online</span>
              </div>
            </label>
          </div>
          
          {selectedPaymentMethod === 'ziina' && (
            <div className="payment-method-content">
              <div className="ziina-payment-wrapper">
                {/* Order Amount and Payment Method Display */}
                <div className="ziina-simple-summary">
                  {shippingFeeDetails && shippingFeeDetails.fee > 0 && (
                    <>
                      <div className="summary-row simple">
                        <span>Order Subtotal:</span>
                        <span className="amount">{shippingFeeDetails.subtotal.toFixed(2)} AED</span>
                      </div>
                      <div className="summary-row simple">
                        <span>Shipping Fee:</span>
                        <span className="amount shipping-fee">{shippingFeeDetails.fee.toFixed(2)} AED</span>
                      </div>
                      <div className="summary-row simple total-row">
                        <span>Total to Pay:</span>
                        <span className="amount total">{amount.toFixed(2)} AED</span>
                      </div>
                    </>
                  )}
                  {!shippingFeeDetails || shippingFeeDetails.fee === 0 ? (
                    <div className="summary-row simple">
                      <span>Order Amount:</span>
                      <span className="amount">{amount.toFixed(2)} AED</span>
                    </div>
                  ) : null}
                  <div className="summary-row simple">
                    <span>Payment Method:</span>
                    <span className="method">Card / Apple Pay / Google Pay</span>
                  </div>
                </div>
                <PaymentErrorBoundary
                  onError={(error: Error) => {
                    console.error('Ziina payment component error:', error);
                    handleZiinaError(error);
                  }}
                >
                  <ZiinaPayment
                    key={`ziina-${amount}-${items.length}`}
                    amount={amount}
                    items={items}
                    shippingAddress={shippingAddress}
                    orderId={`order-${Date.now()}`}
                    onSuccess={handleZiinaSuccess}
                    onError={handleZiinaError}
                    disabled={disabled || isProcessing}
                  />
                </PaymentErrorBoundary>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentOptions;