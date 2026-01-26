import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/global.css';

const ModernLogin: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null);
  const [otpCountdown, setOtpCountdown] = useState<number | null>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle OTP countdown timer
  useEffect(() => {
    if (otpCountdown === null || otpCountdown <= 0) return;
    
    const timer = setInterval(() => {
      setOtpCountdown(prev => {
        if (prev === null || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Get redirect URL from query params or state - stay on current page for customers
  const getRedirectPath = () => {
    // Check if redirected from cart/checkout
    const searchParams = new URLSearchParams(location.search);
    const from = searchParams.get('from');
    const returnTo = searchParams.get('returnTo');
    
    // If coming from cart or checkout, redirect back there
    if (from === 'cart' || returnTo?.includes('cart')) {
      return '/checkout';
    }
    
    // If coming from checkout flow, redirect back to checkout
    if (from === 'checkout' || returnTo?.includes('checkout')) {
      return '/checkout';
    }
    
    // Check if there's a state-based redirect (from React Router)
    if (location.state?.from) {
      const fromPath = location.state.from.pathname;
      return fromPath;
    }
    
    // Default: redirect to homepage for normal customer login
    return '/';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(value);
    setOtpError('');
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');

    try {
      if (!formData.email.trim()) {
        setOtpError('Please enter your email address');
        setOtpLoading(false);
        return;
      }

      if (!formData.password.trim()) {
        setOtpError('Please enter a password');
        setOtpLoading(false);
        return;
      }

      if (!formData.full_name.trim()) {
        setOtpError('Please enter your full name');
        setOtpLoading(false);
        return;
      }

      const response = await authAPI.sendSignupOTP(formData.email, formData.phone);
      
      if (response.data.success) {
        setOtpSent(true);
        setOtpCountdown(300); // 5 minutes
        setError('');
      }
    } catch (err: any) {
      console.error('Send OTP error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Failed to send OTP';
      setOtpError(errorMessage);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');

    try {
      if (otpCode.length !== 6) {
        setOtpError('Please enter a valid 6-digit OTP');
        setOtpLoading(false);
        return;
      }

      const response = await authAPI.verifySignupOTP(formData.email, otpCode);
      
      if (response.data.success) {
        // Store temp token for account creation
        setTempToken(response.data.temp_token);
        setOtpSent(false); // Move to account creation step
        setOtpCode('');
      }
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Failed to verify OTP';
      setOtpError(errorMessage);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!tempToken) {
        setError('OTP verification required');
        setLoading(false);
        return;
      }

      const registerData = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone || '',
        user_type: 'customer' as 'customer' | 'seller',
        temp_token: tempToken
      };
      
      const response = await authAPI.registerWithOTP(registerData);
      
      if (response.data.message || response.data.token) {
        // Login the user
        login(response.data.token, response.data.user);
        navigate(getRedirectPath(), { replace: true });
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Registration failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const response = await authAPI.login(formData.email, formData.password);
        
        // Check if user is actually a customer
        if (response.data.user.user_type !== 'customer') {
          setError('This is a customer login page. Sellers should use the seller portal.');
          setLoading(false);
          return;
        }
        
        // Get the redirect path and login with redirect
        const redirectPath = getRedirectPath();
        login(response.data.token, response.data.user);
        navigate(redirectPath, { replace: true });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        <div className="auth-container">
          <div className="auth-card card">
            <div className="card-header">
              <h1 className="auth-title">
                {isLogin ? 'Customer Login' : 'Create Customer Account'}
              </h1>
              <p className="auth-subtitle">
                {isLogin ? 'Sign in to start shopping' : 'Join TheNileKart today'}
              </p>
            </div>
            
            <div className="card-body">
              {error && (
                <div className="error-alert">
                  {error}
                </div>
              )}
              
              {isLogin ? (
                // LOGIN FORM
                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                      placeholder="Enter your email"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="password" className="form-label">
                      Password *
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                      minLength={6}
                      placeholder="Enter your password"
                    />
                    <div className="text-right mt-2">
                      <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                        Forgot Password?
                      </Link>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg auth-submit"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Sign In'}
                  </button>
                </form>
              ) : (
                // SIGNUP FORM WITH OTP
                <>
                  {!otpSent && !tempToken ? (
                    // Step 1: Enter details and send OTP
                    <form onSubmit={handleSendOTP} className="auth-form">
                      <div className="form-group">
                        <label htmlFor="full_name" className="form-label">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          id="full_name"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          className="form-control"
                          required
                          placeholder="Enter your full name"
                          disabled={otpSent}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="email" className="form-label">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="form-control"
                          required
                          placeholder="Enter your email"
                          disabled={otpSent}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="password" className="form-label">
                          Password *
                        </label>
                        <input
                          type="password"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="form-control"
                          required
                          minLength={6}
                          placeholder="Enter your password (min 6 characters)"
                          disabled={otpSent}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="phone" className="form-label">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="form-control"
                          placeholder="Enter your phone number"
                          disabled={otpSent}
                        />
                      </div>
                      
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg auth-submit"
                        disabled={otpLoading}
                      >
                        {otpLoading ? 'Sending OTP...' : 'Send Verification Code'}
                      </button>

                      {otpError && (
                        <div className="error-alert mt-3">
                          {otpError}
                        </div>
                      )}
                    </form>
                  ) : otpSent && !tempToken ? (
                    // Step 2: Verify OTP
                    <form onSubmit={handleVerifyOTP} className="auth-form">
                      <div className="form-group">
                        <label htmlFor="otp" className="form-label">
                          Enter Verification Code *
                        </label>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                          We've sent a 6-digit code to {formData.email}
                        </p>
                        <input
                          type="text"
                          id="otp"
                          value={otpCode}
                          onChange={handleOtpChange}
                          className="form-control"
                          placeholder="000000"
                          maxLength={6}
                          inputMode="numeric"
                          style={{ fontSize: '24px', letterSpacing: '8px', textAlign: 'center' }}
                        />
                        {otpCountdown !== null && (
                          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                            Code expires in: {Math.floor(otpCountdown / 60)}:{String(otpCountdown % 60).padStart(2, '0')}
                          </p>
                        )}
                      </div>
                      
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg auth-submit"
                        disabled={otpLoading || otpCode.length !== 6}
                      >
                        {otpLoading ? 'Verifying...' : 'Verify Code'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode('');
                          setOtpCountdown(null);
                          setOtpError('');
                        }}
                        className="btn btn-secondary btn-lg auth-submit"
                        style={{ marginTop: '10px' }}
                      >
                        Go Back
                      </button>

                      {otpError && (
                        <div className="error-alert mt-3">
                          {otpError}
                        </div>
                      )}
                    </form>
                  ) : tempToken ? (
                    // Step 3: Create account (after OTP verified)
                    <form onSubmit={handleCompleteRegistration} className="auth-form">
                      <div style={{ padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '8px', marginBottom: '20px' }}>
                        <p style={{ margin: '0', color: '#2e7d32', fontSize: '14px' }}>
                          ✓ Email verified successfully! Now create your account.
                        </p>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Email *</label>
                        <input
                          type="email"
                          value={formData.email}
                          className="form-control"
                          disabled
                          style={{ backgroundColor: '#f5f5f5' }}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input
                          type="text"
                          value={formData.full_name}
                          className="form-control"
                          disabled
                          style={{ backgroundColor: '#f5f5f5' }}
                        />
                      </div>
                      
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg auth-submit"
                        disabled={loading}
                      >
                        {loading ? 'Creating Account...' : 'Create Account'}
                      </button>

                      {error && (
                        <div className="error-alert mt-3">
                          {error}
                        </div>
                      )}
                    </form>
                  ) : null}
                </>
              )}
            </div>
            
            {!otpSent && !tempToken && (
              <div className="card-footer">
                <div className="auth-switch">
                  <span>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                  </span>
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                      setOtpError('');
                      setFormData({ email: '', password: '', full_name: '', phone: '' });
                      setOtpCode('');
                      setOtpSent(false);
                      setTempToken('');
                    }}
                    className="auth-switch-btn"
                  >
                    {isLogin ? 'Create Account' : 'Sign In'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernLogin;