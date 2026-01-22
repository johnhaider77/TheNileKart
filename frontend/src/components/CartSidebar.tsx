import React from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './CartSidebar.css';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose }) => {
  const { items, updateQuantity, removeFromCart, getTotalAmount, getTotalItems, getItemPrice } = useCart();
  const { isAuthenticated } = useAuth();

  const handleQuantityChange = (productId: number, newQuantity: number, selectedSize?: string) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, selectedSize);
    } else {
      updateQuantity(productId, newQuantity, selectedSize);
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="cart-sidebar-overlay" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <div className={`cart-sidebar ${isOpen ? 'active' : ''}`}>
        <div className="cart-sidebar-header">
          <h3>Shopping Cart ({getTotalItems()})</h3>
          <button 
            className="cart-close-btn"
            onClick={onClose}
            aria-label="Close cart"
          >
            <span>×</span>
          </button>
        </div>

        <div className="cart-sidebar-content">
          {items.length === 0 ? (
            <div className="empty-cart">
              <p>Your cart is empty</p>
              <button className="btn btn-primary" onClick={onClose}>
                Continue Shopping
              </button>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {items.map((item) => (
                  <div key={`${item.product.id}-${item.selectedSize || 'no-size'}`} className="cart-item">
                    <div className="cart-item-image">
                      <img 
                        src={(() => {
                          // Handle products with JSONB images field
                          if (item.product.images && Array.isArray(item.product.images) && item.product.images.length > 0) {
                            const firstImage = item.product.images[0];
                            if (typeof firstImage === 'string') {
                              return firstImage.startsWith('http') ? firstImage : `http://localhost:5000${firstImage}`;
                            }
                            if (firstImage.url) {
                              return firstImage.url.startsWith('http') ? firstImage.url : `http://localhost:5000${firstImage.url}`;
                            }
                          }
                          // Handle products with single image_url field
                          if (item.product.image_url && typeof item.product.image_url === 'string') {
                            return item.product.image_url.startsWith('http') 
                              ? item.product.image_url 
                              : `http://localhost:5000${item.product.image_url}`;
                          }
                          // Fallback placeholder
                          return 'https://via.placeholder.com/150';
                        })()} 
                        alt={item.product.name}
                      />
                    </div>
                    <div className="cart-item-details">
                      <h4 className="cart-item-title">{item.product.name}</h4>
                      {item.selectedSize && item.selectedSize !== 'One Size' && (
                        <p className="cart-item-size">Size: {item.selectedSize}</p>
                      )}
                      <p className="cart-item-price">AED {getItemPrice(item).toFixed(2)}</p>
                      <div className="cart-item-quantity">
                        <button 
                          className="quantity-btn"
                          onClick={() => handleQuantityChange(item.product.id, item.quantity - 1, item.selectedSize)}
                        >
                          -
                        </button>
                        <span className="quantity">{item.quantity}</span>
                        <button 
                          className="quantity-btn"
                          onClick={() => handleQuantityChange(item.product.id, item.quantity + 1, item.selectedSize)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="cart-item-total">
                      AED {(getItemPrice(item) * item.quantity).toFixed(2)}
                    </div>
                    <button 
                      className="remove-item-btn"
                      onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                      aria-label="Remove item"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="cart-sidebar-footer">
                <div className="cart-total">
                  <strong>Total: AED {getTotalAmount().toFixed(2)}</strong>
                </div>
                
                {!isAuthenticated && (
                  <div className="guest-cart-notice" style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '0.75rem',
                    borderRadius: '0.375rem',
                    marginBottom: '1rem',
                    textAlign: 'center',
                    fontSize: '0.875rem'
                  }}>
                    Sign in to save your cart and checkout
                  </div>
                )}
                
                <div className="cart-actions">
                  {isAuthenticated ? (
                    <Link 
                      to="/checkout" 
                      className="btn btn-primary btn-full"
                      onClick={onClose}
                    >
                      Proceed to Checkout
                    </Link>
                  ) : (
                    <Link 
                      to="/login?from=cart&returnTo=%2Fcheckout"
                      className="btn btn-primary btn-full"
                      onClick={onClose}
                    >
                      Sign In & Checkout
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CartSidebar;