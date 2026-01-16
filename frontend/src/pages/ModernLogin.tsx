import React, { useState } from 'react';
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
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
      } else {
        if (!formData.full_name.trim()) {
          setError('Full name is required');
          setLoading(false);
          return;
        }
        
        const registerData = {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone || '',
          user_type: 'customer' as 'customer' | 'seller'
        };
        
        const response = await authAPI.register(registerData);
        // After registration, login the user automatically
        login(response.data.token, response.data.user);
        navigate(getRedirectPath(), { replace: true });
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
                  {isLogin && (
                    <div className="text-right mt-2">
                      <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                        Forgot Password?
                      </Link>
                    </div>
                  )}
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
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernLogin;