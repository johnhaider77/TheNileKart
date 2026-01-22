import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../services/api';

interface OrderDetails {
  id: number;
  total_amount: number;
  status: string;
  payment_status: string;
  items: any[];
  created_at: string;
}

const ThankYouPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { orderId, paymentMethod } = location.state || {};

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        console.error('❌ No orderId provided to thank you page');
        setError('Order ID not found. Please contact support.');
        setLoading(false);
        return;
      }

      try {
        console.log('📦 Fetching order details for orderId:', orderId);
        
        // Fetch order details from backend
        const response = await ordersAPI.getOrder(orderId);
        
        if (response && response.data && response.data.order) {
          console.log('✅ Order details fetched successfully:', response.data.order);
          setOrderDetails(response.data.order);
        } else {
          console.warn('⚠️ Order response format unexpected:', response);
          // Set a basic order object with just the ID so at least something displays
          setOrderDetails({
            id: orderId,
            total_amount: 0,
            status: 'confirmed',
            payment_status: 'paid',
            items: [],
            created_at: new Date().toISOString()
          });
        }
      } catch (err: any) {
        console.error('❌ Error fetching order details:', err);
        setError(`Failed to load order details: ${err.message || 'Unknown error'}`);
        // Still set basic order object with ID
        setOrderDetails({
          id: orderId,
          total_amount: 0,
          status: 'confirmed',
          payment_status: 'paid',
          items: [],
          created_at: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  const displayOrderId = orderDetails?.id || orderId;
  const displayTotal = orderDetails?.total_amount || 0;

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

              {loading ? (
                <div className="order-loading">
                  <p>Loading order details...</p>
                </div>
              ) : error ? (
                <div className="order-error">
                  <p className="error-message">{error}</p>
                </div>
              ) : null}
              
              {displayOrderId && (
                <div className="order-details">
                  <div className="order-info">
                    <h3>Order Details</h3>
                    <div className="order-item">
                      <span>Order ID:</span>
                      <strong>#{displayOrderId}</strong>
                    </div>
                    {displayTotal > 0 && (
                      <div className="order-item">
                        <span>Total Amount:</span>
                        <strong>AED {displayTotal.toFixed(2)}</strong>
                      </div>
                    )}
                    <div className="order-item">
                      <span>Payment Method:</span>
                      <strong>
                        {paymentMethod === 'ziina' ? 'Card Payment (Ziina)' : 
                         paymentMethod === 'paypal' ? 'PayPal (Paid Online)' : 
                         'Cash on Delivery'}
                      </strong>
                    </div>
                    {orderDetails?.payment_status && (
                      <div className="order-item">
                        <span>Payment Status:</span>
                        <strong style={{ color: orderDetails.payment_status === 'paid' ? '#4CAF50' : '#FFC107' }}>
                          {orderDetails.payment_status === 'paid' ? '✅ Paid' : 
                           orderDetails.payment_status === 'pending' ? '⏳ Pending' :
                           orderDetails.payment_status}
                        </strong>
                      </div>
                    )}
                  </div>
                  
                  <div className="order-status">
                    <h4>What happens next?</h4>
                    <ul>
                      <li>We'll process your order within 24 hours</li>
                      <li>You'll receive a confirmation email shortly</li>
                      <li>Your order will be shipped within 2-3 business days</li>
                      {paymentMethod === 'ziina' ? (
                        <li>✅ Your payment has been processed successfully</li>
                      ) : paymentMethod === 'paypal' ? (
                        <li>Your payment has been processed via PayPal</li>
                      ) : (
                        <li>💰 Pay cash when your order is delivered</li>
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
                {displayOrderId && (
                  <button
                    onClick={() => navigate('/')}
                    className="btn btn-secondary btn-lg"
                    style={{ marginLeft: '10px' }}
                  >
                    Back to Home
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;