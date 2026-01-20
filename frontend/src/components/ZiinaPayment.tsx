import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

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
}

const ZiinaPayment: React.FC<ZiinaPaymentProps> = ({
  amount,
  items,
  shippingAddress,
  orderId,
  onSuccess,
  onError,
  onCancel,
  disabled = false
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

      console.log('Creating Ziina payment intent for order:', {
        orderId,
        amount,
        items: items.length,
        shippingAddress: !!shippingAddress
      });

      // Call backend to create payment intent
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
            orderId,
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

      // Store payment intent ID for later verification
      sessionStorage.setItem('ziinaPaymentIntentId', paymentData.paymentIntentId);
      sessionStorage.setItem('ziinaOrderId', orderId);

      // Redirect to Ziina payment page
      if (paymentData.redirectUrl) {
        console.log('Redirecting to Ziina payment page');
        // Store the current checkout state before redirecting
        sessionStorage.setItem('checkoutData', JSON.stringify({
          shippingAddress,
          items,
          amount,
          orderId
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
          <h3 style={styles.title}>Complete Payment</h3>
          <p style={styles.subtitle}>Secure payment via Ziina</p>
        </div>

        <div style={styles.content}>
          {/* Order Summary */}
          <div style={styles.summary}>
            <div style={styles.summaryRow}>
              <span style={styles.label}>Order Amount:</span>
              <span style={styles.value}>{amount.toFixed(2)} AED</span>
            </div>
            <div style={styles.summaryRow}>
              <span style={styles.label}>Payment Method:</span>
              <span style={styles.value}>Card / Apple Pay / Google Pay</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>⚠️ {error}</p>
            </div>
          )}

          {/* Payment Methods Info */}
          <div style={styles.methodsInfo}>
            <h4 style={styles.methodsTitle}>Accepted Payment Methods:</h4>
            <ul style={styles.methodsList}>
              <li style={styles.methodItem}>💳 Credit/Debit Cards (Visa, Mastercard, etc.)</li>
              <li style={styles.methodItem}>🍎 Apple Pay</li>
              <li style={styles.methodItem}>🤖 Google Pay / Samsung Pay</li>
            </ul>
          </div>

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

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Powered by <strong>Ziina</strong>
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
    margin: '0 0 8px 0'
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
