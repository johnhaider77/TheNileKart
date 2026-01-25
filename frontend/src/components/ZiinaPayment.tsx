import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../services/api';

// Ziina payment component interface
interface ZiinaPaymentProps {
  amount: number;
  items: any[];
  shippingAddress: any;
  orderId: string;
  onSuccess: (details: any) => void;
  onError: (error: any) => void;
  onCancel?: () => void;
  disabled?: boolean;
  appliedPromoCode?: any;
}

const ZiinaPayment: React.FC<ZiinaPaymentProps> = ({
  amount,
  items,
  shippingAddress,
  orderId,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
  appliedPromoCode
}) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate minimum amount (2 AED)
  const isValidAmount = useCallback(() => {
    if (!amount || amount < 2) {
      setError('Minimum order amount is 2 AED');
      return false;
    }
    return true;
  }, [amount]);

  // Initiate Ziina payment
  const initiateZiinaPayment = useCallback(async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Validate amount
      if (!isValidAmount()) {
        setIsProcessing(false);
        return;
      }

      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated');
      }

      console.log('Step 1: Creating order in database before payment...');
      
      // STEP 1: Create order in database first
      // Ensure all required fields are present in shipping address
      const shippingAddressWithPhone = {
        ...shippingAddress,
        phone: shippingAddress.phone || shippingAddress.phoneNumber || shippingAddress.mobile || ''
      };

      // Validate required fields before sending - with detailed error messages
      const requiredFields = [
        { field: 'full_name', minLength: 2, name: 'Full Name' },
        { field: 'address_line1', minLength: 5, name: 'Address' },
        { field: 'city', minLength: 2, name: 'City' },
        { field: 'state', minLength: 1, name: 'State/Province' },
        { field: 'postal_code', minLength: 4, name: 'Postal Code' },
        { field: 'phone', minLength: 8, name: 'Phone Number' }
      ];

      for (const fieldConfig of requiredFields) {
        const value = shippingAddressWithPhone[fieldConfig.field as keyof typeof shippingAddressWithPhone];
        
        // Check if field exists and is not empty
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          throw new Error(`Missing required field: ${fieldConfig.name}`);
        }
        
        // Check minimum length
        const trimmedValue = typeof value === 'string' ? value.trim() : String(value);
        if (trimmedValue.length < fieldConfig.minLength) {
          throw new Error(`${fieldConfig.name} must be at least ${fieldConfig.minLength} characters (currently: ${trimmedValue.length})`);
        }
      }

      console.log('✅ Shipping address validation passed:', {
        full_name: shippingAddressWithPhone.full_name,
        address_line1: shippingAddressWithPhone.address_line1,
        city: shippingAddressWithPhone.city,
        state: shippingAddressWithPhone.state,
        postal_code: shippingAddressWithPhone.postal_code,
        phone: shippingAddressWithPhone.phone,
        address_line2: shippingAddressWithPhone.address_line2 || 'N/A'
      });

      const orderData = {
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          size: item.selectedSize || 'One Size'
        })),
        shipping_address: shippingAddressWithPhone,
        payment_method: 'ziina',
        status: 'pending_payment',  // Set to pending_payment until payment is verified
        promo_code_id: appliedPromoCode?.id
      };

      console.log('📤 Sending order data to backend:', JSON.stringify(orderData, null, 2));
      console.log('📊 Data validation summary:', {
        itemsCount: orderData.items.length,
        hasShippingAddress: !!orderData.shipping_address,
        shippingAddressKeys: Object.keys(orderData.shipping_address),
        paymentMethod: orderData.payment_method
      });

      const orderResponse = await ordersAPI.createOrder(orderData);
      console.log('✅ Order created successfully!', orderResponse.data);
      
      const realOrderId = orderResponse.data.order.id;
      console.log('✅ Real order ID from database:', realOrderId);
      
      console.log('Order created successfully:', {
        realOrderId,
        totalAmount: orderResponse.data.order.total_amount
      });

        console.log('Step 2: Creating Ziina payment intent for order:', {
          orderId: realOrderId,
          amount,
          items: items.length,
          shippingAddress: !!shippingAddress
        });

        // STEP 2: Call backend to create payment intent with the real order ID
        // Use /api for production (deployed on same server via Nginx proxy), localhost for development
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const apiUrl = isProduction ? '/api' : 'http://localhost:5000/api';
      
      console.log('API URL determination:', {
        hostname: window.location.hostname,
        isProduction,
        apiUrl,
        protocol: window.location.protocol
      });
      
      const response = await fetch(
        `${apiUrl}/ziina/payment-intent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            orderId: realOrderId,  // Use the real database order ID
            amount,
            items,
            shippingAddress
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }

      const paymentData = await response.json();
      console.log('Payment intent created:', {
        paymentIntentId: paymentData.paymentIntentId,
        redirectUrl: paymentData.redirectUrl
      });

      // Store payment intent ID and order ID for later verification
      sessionStorage.setItem('ziinaPaymentIntentId', paymentData.paymentIntentId);
      sessionStorage.setItem('ziinaOrderId', realOrderId);  // Store the real order ID

      // IMPORTANT: Ensure cart is saved to localStorage before redirecting
      // The cart items are used to create the order, but we need to preserve them
      // in case the user cancels or fails payment
      const currentCart = items.map(item => ({
        product: item.product,
        quantity: item.quantity,
        selectedSize: item.selectedSize || 'One Size'
      }));
      localStorage.setItem('guestCart', JSON.stringify(currentCart));
      console.log('Cart items preserved to localStorage before Ziina redirect:', currentCart.length, 'items');

      // Redirect to Ziina payment page
      if (paymentData.redirectUrl) {
        console.log('Redirecting to Ziina payment page with order ID:', realOrderId);
        // Store the current checkout state before redirecting
        sessionStorage.setItem('checkoutData', JSON.stringify({
          shippingAddress,
          items,
          amount,
          orderId: realOrderId  // Store the real order ID
        }));
        window.location.href = paymentData.redirectUrl;
      } else {
        throw new Error('No redirect URL provided by payment gateway');
      }

    } catch (err) {
      console.error('Error initiating Ziina payment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process payment';
      setError(errorMessage);
      setIsProcessing(false);
      onError(new Error(errorMessage));
    }
  }, [amount, items, orderId, shippingAddress, isValidAmount, onError]);

  return (
    <div className="ziina-payment-container" style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h3 style={styles.title} className="complete-payment-title">Complete Payment</h3>
        </div>

        <div style={styles.content}>
          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>⚠️ {error}</p>
            </div>
          )}

          {/* Button Container */}
          <div style={styles.buttonContainer}>
            {/* Back Button */}
            <button
              onClick={() => {
                console.log('Back button clicked');
                navigate(-1);
              }}
              disabled={isProcessing}
              style={{
                ...styles.backButton,
                ...(isProcessing ? styles.backButtonDisabled : {})
              }}
              onMouseEnter={(e) => {
                if (!isProcessing) {
                  Object.assign(e.currentTarget.style, styles.backButtonHover);
                }
              }}
              onMouseLeave={(e) => {
                if (!isProcessing) {
                  Object.assign(e.currentTarget.style, { ...styles.backButton });
                }
              }}
            >
              ← Back
            </button>
            
            {/* Pay Button */}
            <button
              onClick={initiateZiinaPayment}
              disabled={disabled || isProcessing || !isValidAmount()}
              style={{
                ...styles.button,
                ...(disabled || isProcessing ? styles.buttonDisabled : {}),
                ...(disabled || isProcessing ? styles.buttonHoverDisabled : styles.buttonHover)
              }}
              onMouseEnter={(e) => {
                if (!disabled && !isProcessing) {
                  Object.assign(e.currentTarget.style, styles.buttonHover);
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !isProcessing) {
                  Object.assign(e.currentTarget.style, { ...styles.button });
                }
              }}
            >
              {isProcessing ? (
                <>
                  <span style={styles.spinner}>⏳ </span>
                  Processing...
                </>
              ) : (
                <>
                  <span style={styles.lockIcon}>🔒 </span>
                  Pay {amount.toFixed(2)} AED Securely
                </>
              )}
            </button>
          </div>

          {/* Security Notice */}
          <p style={styles.securityNotice}>
            ✓ Your payment is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

// Inline styles for the component
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    minHeight: '400px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
    maxWidth: '500px',
    width: '100%',
    overflow: 'hidden'
  },
  header: {
    backgroundColor: '#003d7a',
    color: 'white',
    padding: '24px 20px',
    textAlign: 'center'
  },
  title: {
    fontSize: '22px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: 'white'
  },
  subtitle: {
    fontSize: '14px',
    margin: '0',
    opacity: 0.9
  },
  content: {
    padding: '24px 20px'
  },
  summary: {
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    fontSize: '14px'
  },
  label: {
    color: '#666',
    fontWeight: '500'
  },
  value: {
    color: '#333',
    fontWeight: '600'
  },
  errorBox: {
    backgroundColor: '#ffebee',
    border: '1px solid #f44336',
    borderRadius: '6px',
    padding: '12px 16px',
    marginBottom: '20px'
  },
  errorText: {
    color: '#c62828',
    fontSize: '14px',
    margin: '0'
  },
  methodsInfo: {
    backgroundColor: '#e3f2fd',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    borderLeft: '4px solid #2196f3'
  },
  methodsTitle: {
    color: '#1565c0',
    fontSize: '14px',
    fontWeight: '600',
    margin: '0 0 12px 0'
  },
  methodsList: {
    margin: '0',
    paddingLeft: '20px',
    color: '#1565c0',
    fontSize: '13px'
  },
  methodItem: {
    marginBottom: '8px',
    lineHeight: '1.4'
  },
  buttonContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '0'
  },
  backButton: {
    flex: '0 0 auto',
    padding: '14px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minWidth: '100px'
  },
  backButtonHover: {
    backgroundColor: '#e0e0e0',
    borderColor: '#999',
    color: '#333'
  },
  backButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ddd',
    color: '#999',
    cursor: 'not-allowed',
    opacity: 0.6
  },
  button: {
    flex: '1',
    padding: '14px 20px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#003d7a',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  buttonHover: {
    backgroundColor: '#002c5a',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 61, 122, 0.3)'
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
    opacity: 0.7
  },
  buttonHoverDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed'
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite'
  },
  lockIcon: {
    fontSize: '16px'
  },
  securityNotice: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#666',
    marginTop: '12px',
    margin: '12px 0 0 0'
  },
  footer: {
    backgroundColor: '#f9f9f9',
    borderTop: '1px solid #eee',
    padding: '12px 20px',
    textAlign: 'center'
  },
  footerText: {
    fontSize: '12px',
    color: '#999',
    margin: '0'
  }
};

export default ZiinaPayment;
