import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ThankYouPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { orderId, totalAmount, paymentMethod } = location.state || {};

  return (
    <div className="page-container">
      <div className="container">
        <div className="thank-you-container">
          <div className="thank-you-card card">
            <div className="card-body text-center">
              <div className="thank-you-icon">
                <div className="success-checkmark">
                  <div className="check-icon">
                    <span className="icon-line line-tip"></span>
                    <span className="icon-line line-long"></span>
                    <div className="icon-circle"></div>
                    <div className="icon-fix"></div>
                  </div>
                </div>
              </div>
              
              <h1 className="thank-you-title">Thank You!</h1>
              <p className="thank-you-subtitle">
                Your order has been placed successfully
              </p>
              
              {orderId && (
                <div className="order-details">
                  <div className="order-info">
                    <h3>Order Details</h3>
                    <div className="order-item">
                      <span>Order ID:</span>
                      <strong>#{orderId}</strong>
                    </div>
                    {totalAmount && (
                      <div className="order-item">
                        <span>Total Amount:</span>
                        <strong>AED {totalAmount.toFixed(2)}</strong>
                      </div>
                    )}
                    <div className="order-item">
                      <span>Payment Method:</span>
                      <strong>
                        {paymentMethod === 'paypal' ? 'PayPal (Paid Online)' : 'Cash on Delivery'}
                      </strong>
                    </div>
                  </div>
                  
                  <div className="order-status">
                    <h4>What happens next?</h4>
                    <ul>
                      <li>We'll process your order within 24 hours</li>
                      <li>You'll receive a confirmation email shortly</li>
                      <li>Your order will be shipped within 2-3 business days</li>
                      {paymentMethod === 'paypal' ? (
                        <li>Your payment has been processed successfully</li>
                      ) : (
                        <li>Pay cash when your order is delivered</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="thank-you-actions">
                <button
                  onClick={() => navigate('/products')}
                  className="btn btn-primary btn-lg"
                >
                  Continue Shopping
                </button>
                {/* You could add a "View Order" button that links to order history */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;