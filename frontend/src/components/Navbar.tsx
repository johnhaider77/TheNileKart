import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CartSidebar from './CartSidebar';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated, isCustomer, isSeller } = useAuth();
  const { getTotalItems } = useCart();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const wasSellerUser = isSeller; // Capture before logout clears user data
      await logout();
      
      // Navigate to appropriate login page based on previous user type
      if (wasSellerUser) {
        navigate('/seller/login');
      } else {
        navigate('/');
      }
      setIsMobileMenuOpen(false);
    } catch (error) {
      // Fallback navigation
      if (isSeller) {
        window.location.href = '/seller/login';
      } else {
        window.location.href = '/';
      }
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        {/* Logo */}
        <div className="navbar-brand">
          <Link to="/" className="brand-link" onClick={closeMobileMenu}>
            <div className="header-logo">
              <img 
                src="/TheNileKart.jpeg" 
                alt="TheNileKart" 
                className="header-logo-img"
              />
              <h3 className="header-logo-text">TheNileKart</h3>
            </div>
          </Link>
        </div>

        {/* Desktop Menu */}
        {/* Navigation Menu */}
        <div className="navbar-menu desktop-only">
          <div className="nav-links">
            {/* Seller specific links */}
            {isAuthenticated && isSeller && (
              <>
                <Link to="/seller/dashboard" className="nav-link">
                  Dashboard
                </Link>
                <Link to="/seller/create-product" className="nav-link">
                  Add Product
                </Link>
                <Link to="/seller/inventory" className="nav-link">
                  Inventory
                </Link>
                <Link to="/seller/orders" className="nav-link">
                  Orders
                </Link>
              </>
            )}
          </div>
        </div>

        {/* User Menu */}
        <div className="navbar-user desktop-only">
          {/* Cart for customers and guests only */}
          {!isSeller && (
            <button 
              onClick={toggleCart} 
              className="nav-link cart-link"
              style={{ marginRight: '1rem', backgroundColor: '#f76d9d', color: 'white' }}
            >
              &#x1F6D2; ({getTotalItems()})
            </button>
          )}
          
          {isAuthenticated ? (
            <div className="user-menu">
              <span className="user-name">Hi, {user?.full_name}</span>
              {/* Account button only for customers */}
              {isCustomer && (
                <button 
                  onClick={() => navigate('/account')} 
                  className="btn btn-outline btn-sm"
                  style={{ marginRight: '0.5rem' }}
                >
                  Account
                </button>
              )}
              <button onClick={handleLogout} className="btn btn-outline btn-sm">
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-links">
              <button 
                onClick={() => navigate('/login')} 
                className="btn btn-primary btn-sm"
              >
                Login
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="mobile-controls mobile-only">
          {/* Mobile Cart Button for customers and guests only */}
          {!isSeller && (
            <button
              className="mobile-cart-btn"
              onClick={toggleCart}
              aria-label="Toggle cart"
              style={{ backgroundColor: '#f76d9d', color: 'white' }}
            >
              &#x1F6D2;
              {getTotalItems() > 0 && (
                <span className="cart-badge" style={{ backgroundColor: '#f76d9d', color: 'white' }}>{getTotalItems()}</span>
              )}
            </button>
          )}
          
          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <div className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay"
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: '9998',
            display: 'flex'
          }}
          onClick={closeMobileMenu}
        >
          <div 
            className="mobile-menu-panel"
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              width: '80%',
              height: '100vh',
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(10px)',
              zIndex: '9999',
              padding: '80px 20px 20px 20px',
              overflowY: 'auto',
              boxShadow: '2px 0 20px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-menu-content">
              {isAuthenticated ? (
                <>
                  <div className="mobile-user-info" style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>Hi, {user?.full_name || user?.email}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{user?.user_type}</div>
                  </div>
                  
                  <div className="mobile-nav-links">
                    {isCustomer && (
                      <>
                        <Link to="/account" className="mobile-nav-link" onClick={closeMobileMenu} style={{ display: 'block', padding: '12px 0', fontSize: '16px', color: '#333', textDecoration: 'none', borderBottom: '1px solid #f0f0f0' }}>Account</Link>
                      </>
                    )}
                    
                    {isSeller && (
                      <>
                        <Link to="/seller/dashboard" className="mobile-nav-link" onClick={closeMobileMenu} style={{ display: 'block', padding: '12px 0', fontSize: '16px', color: '#333', textDecoration: 'none', borderBottom: '1px solid #f0f0f0' }}>Dashboard</Link>
                        <Link to="/seller/create-product" className="mobile-nav-link" onClick={closeMobileMenu} style={{ display: 'block', padding: '12px 0', fontSize: '16px', color: '#333', textDecoration: 'none', borderBottom: '1px solid #f0f0f0' }}>Add Product</Link>
                        <Link to="/seller/inventory" className="mobile-nav-link" onClick={closeMobileMenu} style={{ display: 'block', padding: '12px 0', fontSize: '16px', color: '#333', textDecoration: 'none', borderBottom: '1px solid #f0f0f0' }}>Inventory</Link>
                        <Link to="/seller/orders" className="mobile-nav-link" onClick={closeMobileMenu} style={{ display: 'block', padding: '12px 0', fontSize: '16px', color: '#333', textDecoration: 'none', borderBottom: '1px solid #f0f0f0' }}>Orders</Link>
                      </>
                    )}
                  </div>

                  {isCustomer && (
                    <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee', marginBottom: '20px', paddingBottom: '20px' }}>
                      <h3 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Shop by Category</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Link to="/products" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>All Categories</Link>
                        <Link to="/products?category=Mobiles, Tablets & Accessories" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>📱 Mobiles, Tablets & Accessories</Link>
                        <Link to="/products?category=Computers & Office Supplies" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>💻 Computers & Office Supplies</Link>
                        <Link to="/products?category=TV, Appliances & Electronics" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>📺 TV, Appliances & Electronics</Link>
                        <Link to="/products?category=Women's Fashion" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>👗 Women's Fashion</Link>
                        <Link to="/products?category=Men's Fashion" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>👔 Men's Fashion</Link>
                        <Link to="/products?category=Kids Fashion" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>👶 Kids Fashion</Link>
                        <Link to="/products?category=Health, Beauty & Perfumes" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>💄 Health, Beauty & Perfumes</Link>
                        <Link to="/products?category=Intimacy" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>💝 Intimacy</Link>
                        <Link to="/products?category=Grocery" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>🛒 Grocery</Link>
                        <Link to="/products?category=Home, Kitchen & Pets" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>🏠 Home, Kitchen & Pets</Link>
                        <Link to="/products?category=Tools & Home Improvement" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>🔧 Tools & Home Improvement</Link>
                        <Link to="/products?category=Toys, Games & Baby" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>🧸 Toys, Games & Baby</Link>
                        <Link to="/products?category=Sports, Fitness & Outdoors" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>⚽ Sports, Fitness & Outdoors</Link>
                        <Link to="/products?category=Books" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>📚 Books</Link>
                        <Link to="/products?category=Video Games" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>🎮 Video Games</Link>
                        <Link to="/products?category=Automotive" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>🚗 Automotive</Link>
                      </div>
                    </div>
                  )}
                  
                  <button 
                    onClick={handleLogout} 
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      marginTop: '20px', 
                      backgroundColor: '#dc3545', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      fontSize: '16px', 
                      cursor: 'pointer'
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <div className="mobile-auth-links">
                    <Link 
                      to="/login" 
                      onClick={closeMobileMenu}
                      style={{ 
                        display: 'block', 
                        padding: '12px', 
                        marginBottom: '20px', 
                        textAlign: 'center', 
                        backgroundColor: '#007bff', 
                        color: 'white', 
                        border: '2px solid #007bff', 
                        borderRadius: '6px', 
                        textDecoration: 'none',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                    >
                      Login
                    </Link>
                  </div>
                  
                  <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Shop by Category</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <Link to="/products" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>All Categories</Link>
                      <Link to="/products?category=Mobiles, Tablets & Accessories" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>📱 Mobiles, Tablets & Accessories</Link>
                      <Link to="/products?category=Computers & Office Supplies" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>💻 Computers & Office Supplies</Link>
                      <Link to="/products?category=TV, Appliances & Electronics" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>📺 TV, Appliances & Electronics</Link>
                      <Link to="/products?category=Women's Fashion" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>👗 Women's Fashion</Link>
                      <Link to="/products?category=Men's Fashion" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>👔 Men's Fashion</Link>
                      <Link to="/products?category=Kids Fashion" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>👶 Kids Fashion</Link>
                      <Link to="/products?category=Health, Beauty & Perfumes" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>💄 Health, Beauty & Perfumes</Link>
                      <Link to="/products?category=Intimacy" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>💝 Intimacy</Link>
                      <Link to="/products?category=Grocery" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>🛒 Grocery</Link>
                      <Link to="/products?category=Home, Kitchen & Pets" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>🏠 Home, Kitchen & Pets</Link>
                      <Link to="/products?category=Tools & Home Improvement" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>🔧 Tools & Home Improvement</Link>
                      <Link to="/products?category=Toys, Games & Baby" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>🧸 Toys, Games & Baby</Link>
                      <Link to="/products?category=Sports, Fitness & Outdoors" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>⚽ Sports, Fitness & Outdoors</Link>
                      <Link to="/products?category=Books" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>📚 Books</Link>
                      <Link to="/products?category=Video Games" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>🎮 Video Games</Link>
                      <Link to="/products?category=Automotive" onClick={closeMobileMenu} style={{ color: '#007bff', textDecoration: 'none', padding: '8px 0' }}>🚗 Automotive</Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay" 
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Cart Sidebar */}
      <CartSidebar isOpen={isCartOpen} onClose={closeCart} />
    </nav>
  );
};

export default Navbar;