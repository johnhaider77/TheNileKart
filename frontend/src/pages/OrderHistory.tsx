import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/OrderHistory.css';

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
    selected_size?: string;
    product: {
      id: number;
      name: string;
      image_url?: string;
      images?: Array<any>;
      category: string;
    };
  }>;
}

const OrderHistory: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

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
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  useEffect(() => {
    fetchOrders();
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterOrders();
  }, [orders, selectedMonth, selectedYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrders = async () => {
    const token = localStorage.getItem('token');
    if (!token || !isAuthenticated) {
      setError('Please login to view order history');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Handle authentication errors silently
      if (response.status === 401) {
        // Token expired, clear auth data and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('guestCart');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError('Failed to load order history');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (selectedMonth !== 'all') {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        const orderMonth = (orderDate.getMonth() + 1).toString().padStart(2, '0');
        const orderYear = orderDate.getFullYear().toString();
        
        return orderMonth === selectedMonth && orderYear === selectedYear;
      });
    } else if (selectedYear !== 'all') {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        const orderYear = orderDate.getFullYear().toString();
        return orderYear === selectedYear;
      });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'processing': 'status-processing',
      'shipped': 'status-shipped',
      'delivered': 'status-delivered',
      'cancelled': 'status-cancelled'
    };

    return (
      <span className={`status-badge ${statusClasses[status as keyof typeof statusClasses] || 'status-pending'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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

  if (loading) {
    return (
      <div className="order-history-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your order history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-history-container">
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={fetchOrders} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-history-container">
      <div className="order-history-header">
        <h1>Order History</h1>
        <p>View and track all your orders</p>
      </div>

      {/* Filter Controls */}
      <div className="filter-controls">
        <div className="filter-group">
          <label htmlFor="year-select">Year:</label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="filter-select"
          >
            {years.map(year => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="month-select">Month:</label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="filter-select"
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-info">
          <span className="results-count">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Orders List */}
      <div className="orders-list">
        {filteredOrders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">📦</div>
            <h3>No orders found</h3>
            <p>
              {selectedMonth !== 'all' || selectedYear !== new Date().getFullYear().toString()
                ? 'No orders found for the selected period.'
                : 'You haven\'t placed any orders yet.'
              }
            </p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <div className="order-number">Order #{order.order_number}</div>
                  <div className="order-date">{formatDate(order.created_at)}</div>
                </div>
                <div className="order-status">
                  {getStatusBadge(order.status)}
                </div>
              </div>

              <div className="order-items">
                {order.items.map(item => (
                  <div key={item.id} className="order-item">
                    <div 
                      className="item-image" 
                      style={{
                        width: '64px',
                        height: '64px',
                        minWidth: '64px',
                        minHeight: '64px',
                        maxWidth: '64px',
                        maxHeight: '64px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
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
                      />
                    </div>
                    <div className="item-details">
                      <h4 className="item-name">{item.product.name}</h4>
                      <p className="item-category">{item.product.category}</p>
                      {item.selected_size && item.selected_size !== 'One Size' && (
                        <p className="item-size">Size: {item.selected_size}</p>
                      )}
                      <div className="item-quantity-price">
                        <span>Qty: {item.quantity}</span>
                        <span>Price: {formatCurrency(item.price)}</span>
                      </div>
                    </div>
                    <div className="item-total">
                      {formatCurrency(parseFloat(item.price) * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <div className="order-total">
                  <strong>Total: {formatCurrency(order.total_amount)}</strong>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrderHistory;