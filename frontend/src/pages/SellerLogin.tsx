import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SellerLogin: React.FC = () => {
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
        // Login
        const response = await authAPI.login(formData.email, formData.password);
        if (response.data.user.user_type !== 'seller') {
          setError('Invalid seller credentials');
          setLoading(false);
          return;
        }
        login(response.data.token, response.data.user);
        navigate('/seller/dashboard');
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
          user_type: 'seller' as const,
          phone: formData.phone || undefined
        };
        
        const response = await authAPI.register(registerData);
        login(response.data.token, response.data.user);
        navigate('/seller/dashboard');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(
        error.response?.data?.message || 
        error.response?.data?.errors?.[0]?.msg ||
        'Authentication failed. Please try again.'
      );
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
                {isLogin ? 'Seller Login' : 'Create Seller Account'}
              </h1>
              <p className="auth-subtitle">
                {isLogin ? 'Access your seller dashboard' : 'Start selling on TheNileKart'}
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
                  {isLogin ? "Don't have a seller account?" : "Already have an account?"}
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
              
              <div className="auth-links">
                <Link to="/login" className="customer-login-link">
                  Are you a customer? Login here
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerLogin;