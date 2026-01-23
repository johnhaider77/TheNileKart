import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect URL from query params or state
  const getRedirectPath = () => {
    // Check if redirected from cart/checkout
    const searchParams = new URLSearchParams(location.search);
    const from = searchParams.get('from');
    const returnTo = searchParams.get('returnTo');
    
    // If coming from cart or checkout, redirect back there
    if (from === 'cart' || returnTo?.includes('cart')) {
      return '/cart';
    }
    
    // If coming from checkout flow, redirect back to checkout
    if (from === 'checkout' || returnTo?.includes('checkout')) {
      return '/checkout';
    }
    
    // Check if there's a state-based redirect (from React Router)
    if (location.state?.from) {
      const fromPath = location.state.from.pathname;
      if (fromPath.includes('cart') || fromPath.includes('checkout')) {
        return fromPath;
      }
    }
    
    // Default: redirect to homepage for normal login
    return '/';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login
        const response = await authAPI.login(formData.email, formData.password);
        
        // Check if user is actually a customer
        if (response.data.user.user_type !== 'customer') {
          setError('This is a customer login page. Sellers should use the seller portal.');
          setLoading(false);
          return;
        }
        
        login(response.data.token, response.data.user);
        
        // Smart redirect based on where user came from
        const redirectPath = getRedirectPath();
        navigate(redirectPath, { replace: true });
      } else {
        // Register
        if (!formData.full_name.trim()) {
          setError('Full name is required');
          setLoading(false);
          return;
        }
        
        const registerData = {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          user_type: 'customer' as const,
          phone: formData.phone || undefined
        };
        
        const response = await authAPI.register(registerData);
        login(response.data.token, response.data.user);
        
        // Smart redirect for new users too
        const redirectPath = getRedirectPath();
        navigate(redirectPath, { replace: true });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your network and try again.';
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        errorMessage = 'Network error. Cannot connect to server. Please check your connection.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.errors?.[0]?.msg) {
        errorMessage = error.response.data.errors[0].msg;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
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
              
              <form onSubmit={handleSubmit} className="auth-form">
                {!isLogin && (
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
                      required={!isLogin}
                      placeholder="Enter your full name"
                    />
                  </div>
                )}
                
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
                </div>
                
                {!isLogin && (
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
                    />
                  </div>
                )}
                
                <button
                  type="submit"
                  className="btn btn-primary btn-lg auth-submit"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                </button>
              </form>
            </div>
            
            <div className="card-footer">
              <div className="auth-switch">
                <span>
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                </span>
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setFormData({ email: '', password: '', full_name: '', phone: '' });
                  }}
                  className="auth-switch-btn"
                >
                  {isLogin ? 'Create Account' : 'Sign In'}
                </button>
              </div>
              
              {isLogin && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Seller?</p>
                  <Link 
                    to="/seller/login" 
                    style={{ 
                      color: '#007bff', 
                      textDecoration: 'none',
                      fontWeight: '500',
                      fontSize: '14px'
                    }}
                  >
                    Seller Login
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;