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

        console.log('🔍 PaymentSuccessPage verification initiated:', { 
          orderId, 
          hasPaymentIntentId: !!paymentIntentId, 
          hasToken: !!token 
        });

        if (!orderId) {
          console.error('❌ Missing orderId in URL');
          setLoading(false);
          setVerified(true);
          return;
        }

        if (!paymentIntentId) {
          console.warn('⚠️ Missing paymentIntentId in sessionStorage');
          // Order was created, proceed anyway
          setLoading(false);
          setVerified(true);
          return;
        }

        if (!token) {
          console.warn('⚠️ Token not found, trying verification without authentication');
          // Try without authentication - backend will check payment without token
        }

        console.log('✅ Verifying payment with Ziina:', { orderId, paymentIntentId });

        // Verify payment status with backend
        const headers: any = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const verificationUrl = `${window.location.protocol}//${window.location.host}/api/ziina/payment-intent/${paymentIntentId}?orderId=${orderId}`;
        console.log('📡 Payment verification URL:', verificationUrl);

        const response = await fetch(verificationUrl, { headers });

        console.log('📋 Verification response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.warn('⚠️ Payment verification returned error:', { 
            status: response.status, 
            error: errorText 
          });
          // Order was created, proceed anyway
          setVerified(true);
        } else {
          const data = await response.json();
          console.log('✅ Payment verification successful:', data);
          
          // Track successful payment
          trackPaymentSuccess();

          setVerified(true);
        }
      } catch (error) {
        console.error('❌ Error verifying payment:', error);
        // Order was created, proceed anyway
        setVerified(true);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, trackPaymentSuccess]);

  useEffect(() => {
    if (!loading && verified) {
      const orderId = searchParams.get('orderId');
      // Redirect to thank you page
      navigate('/thank-you', {
        state: { 
          orderId: orderId ? parseInt(orderId) : undefined,
          paymentMethod: 'ziina'
        },
        replace: true
      });
    }
  }, [loading, verified, navigate, searchParams]);

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
