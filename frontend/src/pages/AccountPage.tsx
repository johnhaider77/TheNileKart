import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { ordersAPI } from '../services/api';

interface Order {
  id: number;
  order_number: string;
  total_amount: string;
  status: string;
  created_at: string;
  items: Array<{
    id: number;
    quantity: number;
    price: string;
    size?: string;
    product: {
      id: number;
      name: string;
      image_url?: string;
      images?: Array<any>;
      category: string;
    };
  }>;
}

interface Address {
  id?: number;
  type: 'shipping' | 'billing';
  full_name: string;
  phone?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

const AccountPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  
  // Initialize with current month and year
  const currentDate = new Date();
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const currentYearString = currentDate.getFullYear().toString();
  
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<string>(currentYearString);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Generate month options
  const months = [
    { value: 'all', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // Generate year options (current year and previous 2 years)
  const currentYear = new Date().getFullYear();
  const years = ['all', ...Array.from({ length: 3 }, (_, i) => currentYear - i)];

  const [newAddress, setNewAddress] = useState<Address>({
    type: 'shipping',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
    is_default: false
  });

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'addresses') {
      fetchAddresses();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterOrders();
  }, [orders, selectedMonth, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync profile data with user data
  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: ''
      });
    }
  }, [user]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      if (!isAuthenticated) {
        console.error('User not authenticated');
        setLoading(false);
        return;
      }
      
      console.log('Fetching orders for user:', user);
      console.log('User type:', user?.user_type);
      console.log('Is customer:', isAuthenticated && user?.user_type === 'customer');
      
      // Use the ordersAPI from services instead of direct fetch
      const response = await ordersAPI.getOrders();
      console.log('Orders API response:', response);
      
      setOrders(response.data.orders || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      
      if (error.response?.status === 403) {
        console.error('403 Forbidden - User does not have customer access');
      } else if (error.response?.status === 401) {
        console.log('401 Unauthorized - clearing tokens and redirecting');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('guestCart');
        window.location.href = '/login';
        return;
      }
      
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (selectedMonth !== 'all' && selectedYear !== 'all') {
      // Filter by both month and year
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        const orderMonth = (orderDate.getMonth() + 1).toString().padStart(2, '0');
        const orderYear = orderDate.getFullYear().toString();
        
        return orderMonth === selectedMonth && orderYear === selectedYear;
      });
    } else if (selectedMonth !== 'all') {
      // Filter by month only (current year)
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        const orderMonth = (orderDate.getMonth() + 1).toString().padStart(2, '0');
        const orderYear = orderDate.getFullYear().toString();
        
        return orderMonth === selectedMonth && orderYear === currentYear.toString();
      });
    } else if (selectedYear !== 'all') {
      // Filter by year only
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        const orderYear = orderDate.getFullYear().toString();
        return orderYear === selectedYear;
      });
    }
    // If both are 'all', show all orders (no filtering needed)

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'pending': 'badge-warning',
      'confirmed': 'badge-info', 
      'processing': 'badge-secondary',
      'shipped': 'badge-primary',
      'delivered': 'badge-success',
      'cancelled': 'badge-error'
    };

    return `badge ${statusClasses[status as keyof typeof statusClasses] || 'badge-warning'}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `AED ${numAmount.toFixed(2)}`;
  };

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/addresses');
      if (response.data.success) {
        setAddresses(response.data.addresses || []);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    // Client-side validation
    const errors = [];
    
    if (!newAddress.full_name.trim() || newAddress.full_name.length < 2) {
      errors.push('Full name must be at least 2 characters');
    }
    
    if (!newAddress.address_line1.trim() || newAddress.address_line1.length < 5) {
      errors.push('Address line 1 must be at least 5 characters');
    }
    
    if (!newAddress.city.trim() || newAddress.city.length < 2) {
      errors.push('City must be at least 2 characters');
    }
    
    if (!newAddress.state.trim() || newAddress.state.length < 2) {
      errors.push('State must be at least 2 characters');
    }
    
    if (!newAddress.postal_code.trim() || newAddress.postal_code.length < 3) {
      errors.push('Postal code must be at least 3 characters');
    }
    
    if (!newAddress.country.trim() || newAddress.country.length < 2) {
      errors.push('Country must be at least 2 characters');
    }
    
    if (errors.length > 0) {
      alert('Please fix the following errors:\n• ' + errors.join('\n• '));
      return;
    }

    try {
      if (editingAddress?.id) {
        // Update existing address
        const response = await api.put(`/api/auth/addresses/${editingAddress.id}`, newAddress);
        if (response.data.success) {
          fetchAddresses();
          setShowAddressForm(false);
          setEditingAddress(null);
          resetAddressForm();
        }
      } else {
        // Create new address
        const response = await api.post('/auth/addresses', newAddress);
        if (response.data.success) {
          fetchAddresses();
          setShowAddressForm(false);
          resetAddressForm();
        }
      }
    } catch (error: any) {
      console.error('Error saving address:', error);
      let errorMessage = 'Failed to save address';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && error.response.data.errors.length > 0) {
        errorMessage = error.response.data.errors.map((err: any) => err.msg || err.message).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        const response = await api.delete(`/api/auth/addresses/${addressId}`);
        if (response.data.success) {
          fetchAddresses();
        }
      } catch (error) {
        console.error('Error deleting address:', error);
        alert('Failed to delete address');
      }
    }
  };

  const handleProfileSave = async () => {
    setProfileLoading(true);
    setError(null);
    
    // Client-side validation
    const errors = [];
    
    if (!profileData.full_name.trim() || profileData.full_name.length < 2) {
      errors.push('Full name must be at least 2 characters');
    }
    
    if (!profileData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.push('Please enter a valid email address');
    }
    
    if (profileData.phone && profileData.phone.trim() && profileData.phone.length < 10) {
      errors.push('Phone number must be at least 10 characters');
    }
    
    if (profileData.password && profileData.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    
    if (errors.length > 0) {
      setError(errors.join(', '));
      setProfileLoading(false);
      return;
    }

    try {
      // Only send fields that have values
      const updateData: any = {};
      if (profileData.full_name) updateData.full_name = profileData.full_name;
      if (profileData.email) updateData.email = profileData.email;
      if (profileData.phone) updateData.phone = profileData.phone;
      if (profileData.password) updateData.password = profileData.password;
      
      const response = await api.put('/auth/profile', updateData);
      if (response.data.success) {
        // Update the user context with new data if available
        window.location.reload(); // Refresh to get updated user data
        setEditingProfile(false);
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const validationErrors = error.response.data.errors
          .map((err: any) => err.msg || err.message)
          .join(', ');
        setError(validationErrors);
      } else if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileCancel = () => {
    setProfileData({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      password: ''
    });
    setEditingProfile(false);
    setError(null);
  };

  // Password change handlers
  const handlePasswordChange = async () => {
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All password fields are required');
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await api.patch('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        setPasswordSuccess('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordChange(false);
      }
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordCancel = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswordChange(false);
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  const handleEditAddress = (address: Address) => {
    setNewAddress(address);
    setEditingAddress(address);
    setShowAddressForm(true);
  };

  const resetAddressForm = () => {
    setNewAddress({
      type: 'shipping',
      full_name: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
      is_default: false
    });
    setEditingAddress(null);
  };

  return (
    <div className="account-page">
      <div className="container mx-auto px-4 py-8">
        <div className="account-header mb-8">
          <h1 className="text-3xl font-bold mb-2">My Account</h1>
          <p className="text-gray-600">Welcome back, {user?.full_name}</p>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs tabs-bordered mb-8">
          <button 
            className={`tab tab-lg ${activeTab === 'orders' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            My Orders
          </button>
          <button 
            className={`tab tab-lg ${activeTab === 'addresses' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('addresses')}
          >
            Addresses
          </button>
          <button 
            className={`tab tab-lg ${activeTab === 'profile' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="orders-section">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Order History</h2>
            </div>

            {/* Filter Controls */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex items-center gap-2">
                  <label htmlFor="year-select" className="font-medium">Year:</label>
                  <select
                    id="year-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="select select-bordered select-sm"
                  >
                    {years.map(year => (
                      <option key={year} value={year.toString()}>
                        {year === 'all' ? 'All Years' : year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="month-select" className="font-medium">Month:</label>
                  <select
                    id="month-select"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="select select-bordered select-sm"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-sm text-gray-600">
                  {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
                <p className="mt-2">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold mb-2">No orders found</h3>
                <p className="text-gray-600 mb-4">
                  {user?.user_type === 'seller' 
                    ? "Seller accounts cannot access customer orders. Please use the seller dashboard."
                    : selectedMonth !== 'all' || selectedYear !== 'all'
                    ? 'No orders found for the selected period.'
                    : 'When you place orders, they\'ll appear here.'
                  }
                </p>
                <div className="text-sm text-gray-500 mb-4">
                  <div>Total orders loaded: {orders.length}</div>
                  <div>Filtered orders: {filteredOrders.length}</div>
                  <div>Authentication token: {localStorage.getItem('token') ? '✓ Present' : '✗ Missing'}</div>
                  <div>User type: {user?.user_type || 'Unknown'}</div>
                  <div>User ID: {user?.id || 'Unknown'}</div>
                </div>
                <button 
                  className="btn btn-primary"
                  onClick={() => window.location.href = user?.user_type === 'seller' ? '/seller/dashboard' : '/products'}
                >
                  {user?.user_type === 'seller' ? 'Go to Dashboard' : 'Start Shopping'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => (
                  <div key={order.id} className="card bg-white shadow-md">
                    <div className="card-header bg-gray-50 p-4 border-b">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-lg">Order #{order.order_number}</h3>
                          <div className="text-sm text-gray-600">
                            Placed on {formatDate(order.created_at)}
                          </div>
                        </div>
                        <span className={getStatusBadge(order.status)}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="card-body p-4">
                      <div className="space-y-3">
                        {order.items.map(item => (
                          <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                            <div 
                              className="bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden"
                              style={{
                                width: '64px',
                                height: '64px',
                                minWidth: '64px',
                                minHeight: '64px',
                                maxWidth: '64px',
                                maxHeight: '64px',
                                flexShrink: 0
                              }}
                            >
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
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover' as const,
                                    display: 'block'
                                  }}
                                  onError={(e: any) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<span class="text-gray-500">📦</span>';
                                    }
                                  }}
                                />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{item.product.name}</h4>
                              {item.size && (
                                <p className="text-sm text-accent font-medium" style={{ margin: '2px 0', color: 'var(--text-accent)' }}>Size: {item.size}</p>
                              )}
                              <div className="flex gap-4 text-sm text-gray-600">
                                <span>Qty: {item.quantity}</span>
                                <span>Price: {formatCurrency(item.price)}</span>
                              </div>
                            </div>
                            <div className="text-lg font-semibold text-primary">
                              {formatCurrency(parseFloat(item.price) * item.quantity)}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t flex justify-end">
                        <div className="text-xl font-bold text-primary">
                          Total: {formatCurrency(order.total_amount)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <div className="addresses-section">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Saved Addresses</h2>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  resetAddressForm();
                  setShowAddressForm(true);
                }}
              >
                Add New Address
              </button>
            </div>

            {/* Address Form Modal */}
            {showAddressForm && (
              <div className="modal modal-open">
                <div className="modal-box w-11/12 max-w-2xl">
                  <h3 className="font-bold text-lg mb-4">
                    {editingAddress ? 'Edit Address' : 'Add New Address'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Address Type</span>
                      </label>
                      <select 
                        className="select select-bordered"
                        value={newAddress.type}
                        onChange={(e) => setNewAddress({...newAddress, type: e.target.value as 'shipping' | 'billing'})}
                      >
                        <option value="shipping">Shipping</option>
                        <option value="billing">Billing</option>
                      </select>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Full Name *</span>
                      </label>
                      <input 
                        type="text"
                        className="input input-bordered"
                        value={newAddress.full_name}
                        onChange={(e) => setNewAddress({...newAddress, full_name: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Phone Number *</span>
                      </label>
                      <input 
                        type="tel"
                        className="input input-bordered"
                        value={newAddress.phone || ''}
                        onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-control md:col-span-2">
                      <label className="label">
                        <span className="label-text">Address Line 1 *</span>
                      </label>
                      <input 
                        type="text"
                        className="input input-bordered"
                        value={newAddress.address_line1}
                        onChange={(e) => setNewAddress({...newAddress, address_line1: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-control md:col-span-2">
                      <label className="label">
                        <span className="label-text">Address Line 2</span>
                      </label>
                      <input 
                        type="text"
                        className="input input-bordered"
                        value={newAddress.address_line2 || ''}
                        onChange={(e) => setNewAddress({...newAddress, address_line2: e.target.value})}
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">City *</span>
                      </label>
                      <input 
                        type="text"
                        className="input input-bordered"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">State *</span>
                      </label>
                      <input 
                        type="text"
                        className="input input-bordered"
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Postal Code *</span>
                      </label>
                      <input 
                        type="text"
                        className="input input-bordered"
                        value={newAddress.postal_code}
                        onChange={(e) => setNewAddress({...newAddress, postal_code: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Country *</span>
                      </label>
                      <input 
                        type="text"
                        className="input input-bordered"
                        value={newAddress.country}
                        onChange={(e) => setNewAddress({...newAddress, country: e.target.value})}
                        required
                      />
                    </div>

                    <div className="form-control md:col-span-2">
                      <label className="cursor-pointer label">
                        <span className="label-text">Set as default address</span>
                        <input 
                          type="checkbox" 
                          className="checkbox checkbox-primary"
                          checked={newAddress.is_default}
                          onChange={(e) => setNewAddress({...newAddress, is_default: e.target.checked})}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="modal-action">
                    <button 
                      className="btn btn-ghost"
                      onClick={() => {
                        setShowAddressForm(false);
                        resetAddressForm();
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={handleSaveAddress}
                    >
                      {editingAddress ? 'Update Address' : 'Save Address'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
                <p className="mt-2">Loading addresses...</p>
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏠</div>
                <h3 className="text-xl font-semibold mb-2">No saved addresses</h3>
                <p className="text-gray-600">Add your first address for faster checkout.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map(address => (
                  <div key={address.id} className="card bg-white shadow-md">
                    <div className="card-body">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{address.full_name}</h3>
                          <span className={`badge ${address.type === 'shipping' ? 'badge-info' : 'badge-warning'}`}>
                            {address.type}
                          </span>
                          {address.is_default && (
                            <span className="badge badge-success ml-2">Default</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p>{address.address_line1}</p>
                        {address.address_line2 && <p>{address.address_line2}</p>}
                        <p>{address.city}, {address.state} {address.postal_code}</p>
                        <p>{address.country}</p>
                      </div>
                      
                      <div className="card-actions justify-end mt-4">
                        <button 
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleEditAddress(address)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-sm btn-error"
                          onClick={() => address.id && handleDeleteAddress(address.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Profile Information</h2>
              {!editingProfile ? (
                <button 
                  className="btn btn-primary"
                  onClick={() => setEditingProfile(true)}
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    className="btn btn-outline"
                    onClick={handleProfileCancel}
                    disabled={profileLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handleProfileSave}
                    disabled={profileLoading}
                  >
                    {profileLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
            
            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}
            
            <div className="card bg-white shadow-md">
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Full Name *</span>
                    </label>
                    <input 
                      type="text" 
                      className="input input-bordered" 
                      value={editingProfile ? profileData.full_name : (user?.full_name || '')} 
                      onChange={(e) => editingProfile && setProfileData({...profileData, full_name: e.target.value})}
                      disabled={!editingProfile}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Email Address *</span>
                    </label>
                    <input 
                      type="email" 
                      className="input input-bordered" 
                      value={editingProfile ? profileData.email : (user?.email || '')} 
                      onChange={(e) => editingProfile && setProfileData({...profileData, email: e.target.value})}
                      disabled={!editingProfile}
                      placeholder="Enter your email address"
                    />
                  </div>
                  
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Phone Number</span>
                    </label>
                    <input 
                      type="tel" 
                      className="input input-bordered" 
                      value={editingProfile ? profileData.phone : (user?.phone || '')} 
                      onChange={(e) => editingProfile && setProfileData({...profileData, phone: e.target.value})}
                      disabled={!editingProfile}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Account Type</span>
                    </label>
                    <input 
                      type="text" 
                      className="input input-bordered" 
                      value={user?.user_type || ''} 
                      disabled 
                    />
                  </div>
                  
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Member Since</span>
                    </label>
                    <input 
                      type="text" 
                      className="input input-bordered" 
                      value={user?.created_at ? formatDate(user.created_at) : ''} 
                      disabled 
                    />
                  </div>
                </div>
                
                {!editingProfile && (
                  <>
                    <div className="divider"></div>
                    <p className="text-sm text-gray-600">
                      You can edit your name, email, phone number, and date of birth by clicking the "Edit Profile" button.
                    </p>
                  </>
                )}
              </div>
            </div>
            
            {/* Password Change Section */}
            <div className="password-section mt-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Password & Security</h2>
                {!showPasswordChange ? (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowPasswordChange(true)}
                  >
                    Change Password
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-outline"
                      onClick={handlePasswordCancel}
                      disabled={passwordLoading}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={handlePasswordChange}
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                )}
              </div>
              
              {passwordError && (
                <div className="alert alert-error mb-4">
                  <span>{passwordError}</span>
                </div>
              )}
              
              {passwordSuccess && (
                <div className="alert alert-success mb-4">
                  <span>{passwordSuccess}</span>
                </div>
              )}
              
              <div className="card bg-white shadow-md">
                <div className="card-body">
                  {!showPasswordChange ? (
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg">🔒</div>
                        <div>
                          <h3 className="font-semibold">Password</h3>
                          <p className="text-sm text-gray-600">••••••••••••</p>
                        </div>
                      </div>
                      <div className="divider"></div>
                      <p className="text-sm text-gray-600">
                        Your password is securely encrypted. Click "Change Password" to update it.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }}>
                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <label className="label">
                            <span className="label-text font-semibold">Current Password *</span>
                          </label>
                          <input 
                            type="password" 
                            className="input input-bordered" 
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                            placeholder="Enter your current password"
                            disabled={passwordLoading}
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="label">
                            <span className="label-text font-semibold">New Password *</span>
                          </label>
                          <input 
                            type="password" 
                            className="input input-bordered" 
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                            placeholder="Enter your new password (min 6 characters)"
                            disabled={passwordLoading}
                            minLength={6}
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="label">
                            <span className="label-text font-semibold">Confirm New Password *</span>
                          </label>
                          <input 
                            type="password" 
                            className="input input-bordered" 
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                            placeholder="Confirm your new password"
                            disabled={passwordLoading}
                            required
                          />
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-blue-800 mb-2">Password Requirements:</h4>
                          <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                            <li>Minimum 6 characters long</li>
                            <li>Must be different from your current password</li>
                            <li>Consider using a combination of letters, numbers, and symbols</li>
                          </ul>
                        </div>
                        
                        <div className="flex gap-3 pt-4">
                          <button 
                            type="button"
                            className="btn btn-outline flex-1"
                            onClick={handlePasswordCancel}
                            disabled={passwordLoading}
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="btn btn-primary flex-1"
                            disabled={passwordLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                          >
                            {passwordLoading ? 'Changing...' : 'Update Password'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPage;