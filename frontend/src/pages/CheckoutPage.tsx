import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ordersAPI } from '../services/api';
import { ShippingAddress } from '../utils/types';
import api from '../services/api';
import PaymentOptions from '../components/PaymentOptions';
import Toast from '../components/Toast';
import { useMetrics } from '../hooks/useMetrics';
import '../styles/CheckoutPage.css';

interface SavedAddress {
  id: number;
  type: 'shipping' | 'billing';
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default: boolean;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const CheckoutPage: React.FC = () => {
  const { items, clearCart, updateQuantity, removeFromCart, getTotalAmount, getItemPrice } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Initialize metrics tracking for Checkout Page
  const { trackCheckoutPage, trackCheckoutStart, trackPaymentStart, trackPaymentError, trackPaymentSuccess, trackPaymentPage } = useMetrics({ pageType: 'checkout' });
  
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    full_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    phone: ''
  });
  
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'cart' | 'address' | 'payment'>('cart');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [codDetails, setCodDetails] = useState<{
    eligible: boolean;
    fee: number;
    nonEligibleItems: any[];
  } | undefined>(undefined);

  // Helper function to add toast messages
  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Scroll to top when page loads or step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Handle payment return from Ziina (success/failure/cancel)
  useEffect(() => {
    const paymentStatus = searchParams.get('payment_status');
    const orderId = searchParams.get('orderId');

    // Only process if we actually have a payment status
    if (!paymentStatus) return;

    // Prevent duplicate processing
    const hasProcessed = sessionStorage.getItem('paymentStatusProcessed');
    if (hasProcessed === paymentStatus + '_' + orderId) {
      console.log('⏭️ Payment callback already processed, skipping duplicate');
      return;
    }

    if (paymentStatus === 'success') {
      console.log('✅ Payment callback received - Success for orderId:', orderId);
      sessionStorage.setItem('paymentStatusProcessed', paymentStatus + '_' + orderId);
      addToast('Payment successful! Processing your order...', 'success');
      // Clear the cart since the order has been created
      clearCart();
      // Clear stored order data from session
      sessionStorage.removeItem('pendingOrderData');
      sessionStorage.removeItem('ziinaPaymentIntentId');
      // Navigate to thank you page after a short delay
      setTimeout(() => {
        navigate('/thank-you', { 
          state: { 
            orderId: orderId ? parseInt(orderId) : null,
            paymentMethod: 'ziina'
          } 
        });
      }, 1500);
    } else if (paymentStatus === 'failure') {
      console.log('❌ Payment callback received - Failure for orderId:', orderId);
      sessionStorage.setItem('paymentStatusProcessed', paymentStatus + '_' + orderId);
      addToast('Payment failed. Please try another payment method or contact support.', 'error');
      // Clear stored payment data on failure, but keep cart items
      sessionStorage.removeItem('ziinaPaymentIntentId');
      // Do NOT clear pendingOrderData - user might want to retry
      // Do NOT clear cart - let user see what they were ordering
      // Keep on checkout page to allow retry
      setStep('payment');
      setTimeout(() => {
        const paymentSection = document.querySelector('.payment-method-card');
        paymentSection?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else if (paymentStatus === 'cancelled') {
      console.log('⚠️ Payment callback received - Cancelled for orderId:', orderId);
      sessionStorage.setItem('paymentStatusProcessed', paymentStatus + '_' + orderId);
      addToast('Payment cancelled. Your order was not processed. You can retry payment or modify your order.', 'warning');
      // Clear stored payment data on cancel, but keep cart items
      sessionStorage.removeItem('ziinaPaymentIntentId');
      // Do NOT clear pendingOrderData - user might want to retry
      // Do NOT clear cart - let user see what they were ordering
      // Set step back to payment so user can retry
      setStep('payment');
      setTimeout(() => {
        const paymentSection = document.querySelector('.payment-method-card');
        paymentSection?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, [searchParams, navigate, clearCart]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingAddress({
      ...shippingAddress,
      [e.target.name]: e.target.value
    });
  };

  useEffect(() => {
    if (step === 'address') {
      fetchSavedAddresses();
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Track checkout start when component mounts
  useEffect(() => {
    if (items.length > 0) {
      trackCheckoutStart({
        checkoutItems: items.map(item => ({
          productId: item.product.id,
          name: item.product?.name || '',
          quantity: item.quantity,
          price: getItemPrice(item),
          selectedSize: (item as any).selectedSize // Handle optional selectedSize
        })),
        totalAmount: getTotalAmount(),
        paymentMethod: 'unknown' // Will be updated when payment method is selected
      });
    }
  }, []); // Track once when component mounts

  // Track page visits based on current step
  useEffect(() => {
    switch (step) {
      case 'cart':
      case 'address':
        trackCheckoutPage();
        break;
      case 'payment':
        trackPaymentPage();
        break;
    }
  }, [step]); // Track whenever step changes

  const fetchSavedAddresses = async () => {
    try {
      const response = await api.get('/auth/addresses');
      if (response.data.success) {
        const shippingAddresses = response.data.addresses.filter((addr: SavedAddress) => addr.type === 'shipping');
        setSavedAddresses(shippingAddresses);
        
        // Auto-select default address if available
        const defaultAddress = shippingAddresses.find((addr: SavedAddress) => addr.is_default);
        if (defaultAddress) {
          selectSavedAddress(defaultAddress);
        }
      }
    } catch (error) {
      // Error fetching addresses - fail silently
    }
  };

  const selectSavedAddress = (address: SavedAddress) => {
    const newShippingAddress = {
      full_name: address.full_name || '',
      address_line1: address.address_line1 || '',
      address_line2: address.address_line2 === null ? '' : (address.address_line2 || ''),
      city: address.city || '',
      state: address.state || '',
      postal_code: address.postal_code || '',
      phone: address.phone === null ? '' : (address.phone || '')
    };
    
    setShippingAddress(newShippingAddress);
    setSelectedAddressId(address.id);
    setShowSavedAddresses(false);
  };

  const handleEditAddress = (address: SavedAddress) => {
    setEditingAddress(address);
  };

  const handleSaveEditedAddress = async (updatedAddress: SavedAddress) => {
    try {
      const response = await api.put(`/api/auth/addresses/${updatedAddress.id}`, updatedAddress);
      if (response.data.success) {
        // Refresh saved addresses
        await fetchSavedAddresses();
        
        // Update current form if this was the selected address
        if (selectedAddressId === updatedAddress.id) {
          selectSavedAddress(updatedAddress);
        }
        
        setEditingAddress(null);
      }
    } catch (error) {
      console.error('Error updating address:', error);
      alert('Failed to update address');
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        const response = await api.delete(`/api/auth/addresses/${addressId}`);
        if (response.data.success) {
          await fetchSavedAddresses();
          
          // Clear form if this was the selected address
          if (selectedAddressId === addressId) {
            setShippingAddress({
              full_name: '',
              address_line1: '',
              address_line2: '',
              city: '',
              state: '',
              postal_code: '',
              phone: ''
            });
            setSelectedAddressId(null);
          }
        }
      } catch (error) {
        console.error('Error deleting address:', error);
        alert('Failed to delete address');
      }
    }
  };

  const calculateCODDetails = async () => {
    try {
      const cartItems = items.map(item => ({
        product_id: item.product.id,
        selectedSize: item.selectedSize || 'One Size',
        quantity: item.quantity
      }));

      const response = await ordersAPI.calculateCOD(cartItems);
      const data = response.data;
      
      setCodDetails({
        eligible: data.codEligible,
        fee: data.codFee || 0,
        nonEligibleItems: data.nonCodItems || []
      });
    } catch (error: any) {
      console.error('Error calculating COD:', error);
      
      // Handle authentication errors specifically
      if (error.response?.status === 401) {
        // Token expired, handle gracefully
        setError('Session expired. Please log in again to continue with checkout.');
        return;
      }
      
      // For other errors, fall back to a safe default
      // This ensures the COD functionality continues to work even if API fails
      setCodDetails({
        eligible: true, // Default to COD available to avoid blocking users
        fee: 0,
        nonEligibleItems: []
      });
    }
  };

  const handlePlaceOrder = async () => {
    // Check if cart is empty before proceeding
    if (items.length === 0) {
      setError('Your cart is empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check for required fields
      const requiredFields = ['full_name', 'address_line1', 'city', 'state', 'postal_code', 'phone'];
      const missingFields = requiredFields.filter(field => {
        const value = shippingAddress[field as keyof ShippingAddress];
        return !value || value.trim().length === 0;
      });
      
      if (missingFields.length > 0) {
        setError(`Missing required fields: ${missingFields.join(', ')}`);
        setLoading(false);
        return;
      }

      // Check cart items structure
      const invalidItems = items.filter(item => !item.product?.id || !item.quantity);
      if (invalidItems.length > 0) {
        setError('Invalid items in cart');
        setLoading(false);
        return;
      }

      // Check authentication
      const token = localStorage.getItem('token');
      if (!token) {
        // Redirect to login with checkout context
        navigate('/login?from=checkout&returnTo=' + encodeURIComponent(window.location.pathname));
        return;
      }

      const orderData = {
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          size: item.selectedSize || 'One Size'
        })),
        shipping_address: shippingAddress
      };

      const response = await ordersAPI.createOrder(orderData);
      
      // Store order data for payment processing
      sessionStorage.setItem('pendingOrderData', JSON.stringify({
        orderId: response.data.order.id,
        totalAmount: response.data.order.total_amount,
        items: items
      }));
      
      // Don't clear cart yet - only clear on successful payment
      navigate('/thank-you', { 
        state: { 
          orderId: response.data.order.id,
          totalAmount: response.data.order.total_amount 
        } 
      });
    } catch (error: any) {
      // Handle authentication errors silently - let the interceptor handle redirect
      if (error.response?.status === 401 || error.name === 'AuthenticationError') {
        // Don't show error message for auth errors, let interceptor handle it
        return;
      }
      
      // Handle authorization errors (403) - likely user not logged in as customer
      if (error.response?.status === 403) {
        setError('Please log in with a customer account to place orders.');
        return;
      }
      
      setError(
        error.response?.data?.message || 
        'Failed to place order. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const validateAddress = () => {
    const required = ['full_name', 'address_line1', 'city', 'state', 'postal_code', 'phone'];
    const isValid = required.every(field => {
      const value = shippingAddress[field as keyof ShippingAddress];
      return value && value.trim().length > 0;
    });
    return isValid;
  };

  // Payment handlers
  const handlePaymentSuccess = (details: any, data: any) => {
    // Track successful payment
    trackPaymentSuccess();
    
    clearCart();
    navigate('/thank-you', { 
      state: { 
        orderId: details.order.id,
        totalAmount: details.order.total_amount,
        paymentMethod: 'ziina'
      } 
    });
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    setError(error.message || 'Payment failed. Please try again.');
    
    // Track payment error with details
    trackPaymentError({
      errorCode: error.code || 'UNKNOWN',
      errorMessage: error.message || 'Payment failed. Please try again.',
      errorDetails: {
        error: error,
        step: step,
        paymentMethod: 'unknown', // Payment method context
        totalAmount: getTotalAmount(),
        itemCount: items.length
      }
    });
  };

  const handleCODOrder = () => {
    return handlePlaceOrder();
  };

  // Customers cannot delete non-COD items - they must pay online or edit cart manually

  const handleBackToCart = () => {
    // Clear any existing errors
    setError('');
    
    // Set step back to cart with a subtle highlight effect for non-COD items
    setStep('cart');
    
    // Add a temporary highlight to non-COD items in cart for better UX
    if (codDetails && codDetails.nonEligibleItems && codDetails.nonEligibleItems.length > 0) {
      setTimeout(() => {
        const nonCodItemIds = codDetails.nonEligibleItems.map(item => item.id);
        const cartItemElements = document.querySelectorAll('.cart-item');
        
        cartItemElements.forEach((element: any) => {
          const productId = element.getAttribute('data-product-id');
          if (nonCodItemIds.includes(parseInt(productId))) {
            element.style.cssText += `
              border: 2px solid #ff9800;
              background: #fff8e1;
              box-shadow: 0 4px 12px rgba(255, 152, 0, 0.2);
              transition: all 0.3s ease;
            `;
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
              element.style.border = '';
              element.style.background = '';
              element.style.boxShadow = '';
            }, 3000);
          }
        });
      }, 100);
    }
  };

  if (items.length === 0 && step === 'cart') {
    return (
      <div className="page-container">
        <div className="container">
          <div className="empty-cart text-center">
            <h2>Your cart is empty</h2>
            <p>Add some products to get started!</p>
            <button 
              onClick={() => navigate('/products')} 
              className="btn btn-primary"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container">
        {/* Toast Notifications */}
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={4000}
            onClose={() => removeToast(toast.id)}
          />
        ))}
        
        <div className="page-header">
          <h1 className="page-title">Checkout</h1>
          <div className="checkout-steps">
            <div className={`step ${step === 'cart' ? 'active' : 'completed'}`}>
              1. Cart Review
            </div>
            <div className={`step ${step === 'address' ? 'active' : step === 'payment' ? 'completed' : ''}`}>
              2. Shipping Address
            </div>
            <div className={`step ${step === 'payment' ? 'active' : ''}`}>
              3. Payment
            </div>
          </div>
        </div>

        {error && (
          <div className="error-alert mb-4">
            {error}
          </div>
        )}

        <div className="checkout-container">
          {/* Cart Review Step */}
          {step === 'cart' && (
            <div className="checkout-step">
              <div className="cart-items">
                <h3>Review Your Cart</h3>
                {items.map(item => (
                  <div key={item.product.id} className="cart-item card" data-product-id={item.product.id}>
                    <div className="cart-item-content">
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
                              return item.product.image_url.startsWith('http') ? item.product.image_url : `http://localhost:5000${item.product.image_url}`;
                            }
                            // Fallback placeholder
                            return 'https://via.placeholder.com/150';
                          })()} 
                          alt={item.product.name}
                        />
                      </div>
                      
                      <div className="cart-item-details">
                        <h4 className="cart-item-title">{item.product.name}</h4>
                        <p className="cart-item-price">{getItemPrice(item).toFixed(2)}</p>
                        
                        {/* COD Eligibility Status */}
                        {(() => {
                          // Check if this item is COD eligible
                          let isEligible = true;
                          if (item.product.sizes && item.selectedSize) {
                            const sizeData = item.product.sizes.find((size: any) => size.size === item.selectedSize);
                            isEligible = sizeData ? sizeData.cod_eligible === true : false;
                          } else {
                            isEligible = item.product.cod_eligible === true;
                          }
                          
                          return (
                            <div className={`cod-eligibility-badge ${isEligible ? 'eligible' : 'not-eligible'}`}>
                              {isEligible ? (
                                <span>💵 COD Available</span>
                              ) : (
                                <span>💳 Online Payment Only</span>
                              )}
                            </div>
                          );
                        })()}
                        
                        <div className="cart-item-quantity">
                          <button
                            className="quantity-btn"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </button>
                          <span className="quantity">{item.quantity}</span>
                          <button
                            className="quantity-btn"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock_quantity}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <div className="cart-item-total">
                        {(getItemPrice(item) * item.quantity).toFixed(2)}
                      </div>
                      
                      <button
                        className="remove-item-btn"
                        onClick={() => removeFromCart(item.product.id)}
                        aria-label="Remove item"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="cart-summary card">
                  <div className="card-body">
                    <h4>Order Summary</h4>
                    <div className="summary-line">
                      <span>Subtotal:</span>
                      <span>{getTotalAmount().toFixed(2)}</span>
                    </div>
                    <div className="summary-line">
                      <span>Shipping:</span>
                      <span>FREE</span>
                    </div>
                    <div className="summary-line total">
                      <span>Total:</span>
                      <span>{getTotalAmount().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="step-actions">
                <button 
                  onClick={() => navigate('/products')} 
                  className="btn btn-outline"
                >
                  Continue Shopping
                </button>
                <button 
                  onClick={() => setStep('address')} 
                  className="btn btn-primary"
                >
                  Proceed to Shipping
                </button>
              </div>
            </div>
          )}

          {/* Shipping Address Step */}
          {step === 'address' && (
            <div className="checkout-step">
              <div className="address-form-wrapper">
                <h3>Shipping Address</h3>
              
              {/* Saved Addresses Section */}
              {savedAddresses.length > 0 && (
                <div className="saved-addresses-section mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Choose from saved addresses</h5>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => setShowSavedAddresses(!showSavedAddresses)}
                    >
                      {showSavedAddresses ? 'Hide' : 'Show'} Saved Addresses
                    </button>
                  </div>
                  
                  {showSavedAddresses && (
                    <div className="saved-addresses-grid mb-4">
                      {savedAddresses.map(address => (
                        <div key={address.id} className={`saved-address-card ${selectedAddressId === address.id ? 'selected' : ''}`}>
                          <div className="address-content">
                            <div className="address-header">
                              <strong>{address.full_name}</strong>
                              {address.is_default && <span className="badge badge-primary ms-2">Default</span>}
                            </div>
                            <div className="address-details">
                              <p>{address.address_line1}</p>
                              {address.address_line2 && <p>{address.address_line2}</p>}
                              <p>{address.city}, {address.state} {address.postal_code}</p>
                              {address.phone && <p>Phone: {address.phone}</p>}
                            </div>
                          </div>
                          <div className="address-actions">
                            <button
                              type="button"
                              className="btn btn-sm btn-primary me-2"
                              onClick={() => selectSavedAddress(address)}
                            >
                              Select
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary me-2"
                              onClick={() => handleEditAddress(address)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteAddress(address.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <h5>Enter new address</h5>
              <form className="address-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="full_name" className="form-label">Full Name *</label>
                    <input
                      type="text"
                      id="full_name"
                      name="full_name"
                      value={shippingAddress.full_name}
                      onChange={handleAddressChange}
                      className="form-control"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={shippingAddress.phone}
                      onChange={handleAddressChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="address_line1" className="form-label">Address Line 1 *</label>
                  <input
                    type="text"
                    id="address_line1"
                    name="address_line1"
                    value={shippingAddress.address_line1}
                    onChange={handleAddressChange}
                    className="form-control"
                    placeholder="Street address, apartment, suite, etc."
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="address_line2" className="form-label">Address Line 2</label>
                  <input
                    type="text"
                    id="address_line2"
                    name="address_line2"
                    value={shippingAddress.address_line2}
                    onChange={handleAddressChange}
                    className="form-control"
                    placeholder="Building, floor, etc."
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city" className="form-label">City *</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={shippingAddress.city}
                      onChange={handleAddressChange}
                      className="form-control"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="state" className="form-label">State *</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={shippingAddress.state}
                      onChange={handleAddressChange}
                      className="form-control"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="postal_code" className="form-label">Postal Code *</label>
                    <input
                      type="text"
                      id="postal_code"
                      name="postal_code"
                      value={shippingAddress.postal_code}
                      onChange={handleAddressChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>
              </form>
              </div>
              
              <div className="step-actions">
                <button 
                  onClick={() => setStep('cart')} 
                  className="btn btn-outline"
                >
                  Back to Cart
                </button>
                <button 
                  onClick={async () => {
                    // Check if user is still authenticated before proceeding
                    const token = localStorage.getItem('token');
                    if (!token) {
                      setError('Session expired. Please log in again to continue.');
                      navigate('/login?from=checkout');
                      return;
                    }
                    
                    setStep('payment');
                    await calculateCODDetails();
                    
                    // Track payment page visit and payment start
                    trackPaymentPage();
                    trackPaymentStart();
                  }} 
                  className="btn btn-primary"
                  disabled={!validateAddress()}
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          )}

          {/* Payment Step */}
          {step === 'payment' && (
            <div className="checkout-step">
              <div className="payment-wrapper">
                {/* Payment Summary Header */}
              <div className="payment-summary-header">
                <h3>Complete Your Order</h3>
                <div className="order-summary-card">
                  <div className="summary-row">
                    <span className="summary-label">Total Items:</span>
                    <span className="summary-value">{items.reduce((total, item) => total + item.quantity, 0)}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Order Total:</span>
                    <span className="summary-value">AED {getTotalAmount().toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* COD Eligibility Error Section */}
              {codDetails && !codDetails.eligible && codDetails.nonEligibleItems && codDetails.nonEligibleItems.length > 0 && (
                <div className="payment-cod-error">
                  <div className="cod-error-header">
                    <div className="error-icon">⚠️</div>
                    <div className="error-content">
                      <h4>Cash on Delivery Not Available</h4>
                      <p>The following {codDetails.nonEligibleItems.length === 1 ? 'item is' : 'items are'} not eligible for Cash on Delivery:</p>
                    </div>
                  </div>
                  
                  <div className="cod-non-eligible-items">
                    {codDetails.nonEligibleItems.map((item: any, index: number) => (
                      <div key={index} className="non-eligible-item-card">
                        <div className="item-image">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} />
                          ) : (
                            <div className="no-image">📦</div>
                          )}
                        </div>
                        <div className="item-details">
                          <h5>{item.name}</h5>
                          <p className="item-reason">
                            {item.size ? `Size: ${item.size} - ` : ''}
                            COD not available for this item
                          </p>
                        </div>
                        <div className="item-price">
                          AED {item.price ? item.price.toFixed(2) : '0.00'}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="cod-error-actions">
                    <div className="action-section">
                      <h5>To complete your order, you must:</h5>
                      <div className="payment-requirement-card">
                        <span className="payment-icon">💳</span>
                        <div className="payment-content">
                          <strong>Pay Online for Non-COD Items</strong>
                          <p>These items require online payment and cannot be removed during checkout. Use secure PayPal payment to complete your order.</p>
                        </div>
                      </div>
                      
                      <div className="action-buttons">
                        <button 
                          className="btn btn-back-to-cart-page"
                          onClick={handleBackToCart}
                        >
                          <span className="btn-icon">🛒</span>
                          <div className="btn-content">
                            <span className="btn-title">Back to Cart</span>
                            <span className="btn-subtitle">Edit quantities or remove items manually</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <PaymentOptions
                amount={getTotalAmount()}
                items={items}
                shippingAddress={shippingAddress}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                onCODOrder={handleCODOrder}
                disabled={!validateAddress() || loading}
                codDetails={codDetails}
                onBackToCart={handleBackToCart}
              />
              </div>
              
              <div className="step-actions">
                <button 
                  onClick={() => setStep('address')} 
                  className="btn btn-outline"
                  disabled={loading}
                >
                  Back to Address
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Address Modal */}
      {editingAddress && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Edit Address</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingAddress.full_name}
                  onChange={(e) => setEditingAddress({...editingAddress, full_name: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-control"
                  value={editingAddress.phone || ''}
                  onChange={(e) => setEditingAddress({...editingAddress, phone: e.target.value})}
                />
              </div>
              
              <div className="form-group col-span-2">
                <label className="form-label">Address Line 1 *</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingAddress.address_line1}
                  onChange={(e) => setEditingAddress({...editingAddress, address_line1: e.target.value})}
                />
              </div>
              
              <div className="form-group col-span-2">
                <label className="form-label">Address Line 2</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingAddress.address_line2 || ''}
                  onChange={(e) => setEditingAddress({...editingAddress, address_line2: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingAddress.city}
                  onChange={(e) => setEditingAddress({...editingAddress, city: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">State *</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingAddress.state}
                  onChange={(e) => setEditingAddress({...editingAddress, state: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Postal Code *</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingAddress.postal_code}
                  onChange={(e) => setEditingAddress({...editingAddress, postal_code: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Country *</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingAddress.country}
                  onChange={(e) => setEditingAddress({...editingAddress, country: e.target.value})}
                />
              </div>
              
              <div className="form-group col-span-2">
                <label className="form-label flex items-center">
                  <input
                    type="checkbox"
                    className="checkbox me-2"
                    checked={editingAddress.is_default}
                    onChange={(e) => setEditingAddress({...editingAddress, is_default: e.target.checked})}
                  />
                  Set as default shipping address
                </label>
              </div>
            </div>
            
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setEditingAddress(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleSaveEditedAddress(editingAddress)}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;