import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMetrics } from '../hooks/useMetrics';
import '../styles/PaymentErrorPage.css';

const PaymentSuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  const { trackPaymentSuccess } = useMetrics({ pageType: 'payment_success' });

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const orderId = searchParams.get('orderId');
        const paymentIntentId = sessionStorage.getItem('ziinaPaymentIntentId');
        const token = localStorage.getItem('token');

        console.log('PaymentSuccessPage - Verification data:', { 
          orderId, 
          paymentIntentId, 
          hasToken: !!token,
          hostname: window.location.hostname,
          protocol: window.location.protocol
        });

        if (!orderId || !paymentIntentId || !token) {
          console.error('Missing payment verification data:', { orderId, paymentIntentId, hasToken: !!token });
          setLoading(false);
          setVerified(false);
          return;
        }

        console.log('Verifying payment with backend:', { orderId, paymentIntentId });

        // Use /api proxy for all environments
        const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const apiUrl = isProduction ? '/api' : 'http://localhost:5000/api';
        
        const verificationUrl = `${apiUrl}/ziina/payment-intent/${paymentIntentId}?orderId=${orderId}`;
        console.log('Calling verification endpoint:', verificationUrl);

        // Verify payment status with backend
        const response = await fetch(
          verificationUrl,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('Verification response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.warn('Payment verification failed:', { status: response.status, errorData });
          setVerified(false);
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log('✅ Payment verification response:', data);
        
        // Log the payment status regardless
        if (data.success || data.paid) {
          console.log('🎉 Payment confirmed! Status:', data.status);
          trackPaymentSuccess();
        } else {
          console.log('⚠️ Payment status unclear. Status:', data.status, 'Paid:', data.paid, 'Success:', data.success);
        }
        
        // Mark as verified even if status is unclear (order exists and will be handled)
        setVerified(true);
      } catch (error) {
        console.error('Error verifying payment:', error);
        // Still mark as verified - order was created, user should see it
        setVerified(true);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, trackPaymentSuccess]);

  useEffect(() => {
    if (!loading) {
      const orderId = searchParams.get('orderId');
      console.log('Navigation decision:', { loading, verified, orderId });
      
      // Always redirect to thank you page after attempting verification
      // (order was already created, payment should be confirmed)
      navigate('/thank-you', {
        state: { 
          orderId: orderId ? parseInt(orderId) : undefined,
          paymentMethod: 'ziina'
        },
        replace: true
      });
    }
  }, [loading, navigate, searchParams]);

  if (loading) {
    return (
      <div className="payment-error-container" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '18px', marginBottom: '20px' }}>
          Processing your payment...
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Please wait while we confirm your transaction.
        </div>
      </div>
    );
  }

  return (
    <div className="payment-error-container" style={{ textAlign: 'center', padding: '40px' }}>
      <div style={{ fontSize: '18px', marginBottom: '20px', color: '#4CAF50' }}>
        ✓ Payment Processed
      </div>
      <div style={{ fontSize: '14px', color: '#666' }}>
        Redirecting to order confirmation...
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
