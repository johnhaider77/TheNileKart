import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { sellerAPI } from '../services/api';
import { Order } from '../utils/types';
import { useAuth } from '../context/AuthContext';
import '../styles/OrdersManagement.css';

const OrdersManagement: React.FC = () => {
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    customerName: '',
    orderId: '',
    minPrice: '',
    maxPrice: ''
  });
  
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0
  });
  
  const { user } = useAuth();
  
  // Helper function to safely parse monetary values
  const formatCurrency = (amount: number | string | undefined): string => {
    const numAmount = parseFloat(String(amount || '0'));
    return `AED ${numAmount.toFixed(2)}`;
  };
  
  // Helper function to safely parse monetary values to number
  const parseAmount = (amount: number | string | undefined): number => {
    return parseFloat(String(amount || '0'));
  };
  
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'payment_failed', label: 'Payment Failed' }
  ];

  const fetchOrders = async (page: number = 1) => {
    try {
      setLoading(true);
      setError('');
      
      // Debug authentication
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      console.log('Auth token exists:', !!token);
      console.log('Stored user:', storedUser);
      console.log('Current user from context:', user);
      
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }
      
      if (!user || user.user_type !== 'seller') {
        throw new Error('Seller access required. Please log in as a seller.');
      }
      
      const params: any = {
        page,
        limit: 20
      };
      
      if (filters.status) {
        params.status = filters.status;
      }

      console.log('Fetching orders with params:', params);
      console.log('API request URL:', `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/seller/orders`);
      
      const response = await sellerAPI.getSellerOrders(params);
      console.log('Orders API response:', response);
      
      const ordersData = response.data?.orders || response.data || [];
      console.log('Raw orders data:', ordersData);
      
      // Parse shipping address JSON strings
      const processedOrders = ordersData.map((order: any) => {
        if (order.shipping_address && typeof order.shipping_address === 'string') {
          try {
            order.shipping_address = JSON.parse(order.shipping_address);
          } catch (e) {
            console.error('Failed to parse shipping address for order', order.order_id, e);
            order.shipping_address = null;
          }
        }
        return order;
      });
      
      console.log('Processed orders with parsed addresses:', processedOrders);
      
      setOrders(processedOrders);
      setFilteredOrders(processedOrders); // Set filtered orders to all orders initially
      
      // Update pagination data from API response
      if (response.data?.pagination) {
        setPagination({
          currentPage: response.data.pagination.currentPage || 1,
          totalPages: response.data.pagination.totalPages || 1,
          totalOrders: response.data.pagination.totalOrders || processedOrders.length
        });
      } else {
        // Fallback if no pagination data in response
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalOrders: processedOrders.length
        });
      }
      
      console.log('✅ Orders state updated:', {
        ordersLength: processedOrders.length,
        orders: processedOrders,
        filteredOrdersLength: processedOrders.length,
        pagination: response.data?.pagination
      });
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      let errorMessage = 'Failed to load orders';
      
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied. Seller permissions required.';
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setError(errorMessage);
      setOrders([]);
      setFilteredOrders([]); // Clear filtered orders on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for URL parameters to set initial filters
    const urlParams = new URLSearchParams(location.search);
    const statusParam = urlParams.get('status');
    
    if (statusParam) {
      setFilters(prev => ({ ...prev, status: statusParam }));
    }
  }, [location]);

  useEffect(() => {
    console.log('OrdersManagement mounted, user:', user);
    console.log('User type:', user?.user_type);
    console.log('Is authenticated:', !!user);
    
    if (user?.user_type === 'seller') {
      console.log('Fetching orders for seller:', user.email);
      fetchOrders();
    } else {
      console.log('User is not a seller, skipping fetch');
      setError('Seller access required');
      setLoading(false);
    }
  }, []);

  // Apply filters when they change
  useEffect(() => {
    if (orders.length > 0) {
      applyFilters();
    }
  }, [orders, filters]);

  // Remove automatic filter application - now manual only
  // useEffect(() => {
  //   applyFilters();
  // }, [orders, filters]);

  const applyFilters = () => {
    let filtered = [...orders];

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Filter by customer name
    if (filters.customerName.trim()) {
      filtered = filtered.filter(order => 
        order.customer_name?.toLowerCase().includes(filters.customerName.toLowerCase()) ||
        order.customer_email?.toLowerCase().includes(filters.customerName.toLowerCase())
      );
    }

    // Filter by order ID
    if (filters.orderId.trim()) {
      filtered = filtered.filter(order => {
        const orderId = order?.id || order?.order_id;
        if (!orderId) return false;
        return orderId.toString().includes(filters.orderId) ||
               `ORD-${orderId.toString().padStart(8, '0')}`.includes(filters.orderId);
      });
    }

    // Filter by price range
    if (filters.minPrice) {
      filtered = filtered.filter(order => parseAmount(order.total_amount) >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(order => parseAmount(order.total_amount) <= parseFloat(filters.maxPrice));
    }

    setFilteredOrders(filtered);
  };

  const handleApplyFilters = () => {
    applyFilters();
  };

  const handleStatusUpdate = async (order: any, newStatus: string) => {
    const orderId = order?.id || order?.order_id;
    if (!orderId) {
      alert('Invalid order ID');
      return;
    }
    
    try {
      setUpdateLoading(true);
      await sellerAPI.updateOrderStatus(orderId.toString(), newStatus);
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(o => {
          const currentId = o?.id || o?.order_id;
          return currentId === orderId ? { ...o, status: newStatus as any } : o;
        })
      );

      // Update selected order if it's the one being updated
      if (selectedOrder) {
        const selectedId = selectedOrder?.id || selectedOrder?.order_id;
        if (selectedId === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus as any });
        }
      }

      // Show success message
      alert('Order status updated successfully!');
      
    } catch (err: any) {
      console.error('Error updating order status:', err);
      alert(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      customerName: '',
      orderId: '',
      minPrice: '',
      maxPrice: ''
    });
    // Reset to show all orders when clearing filters
    setFilteredOrders(orders);
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const closeOrderDetails = () => {
    setShowOrderDetails(false);
    setSelectedOrder(null);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'shipped': return 'status-shipped';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      case 'payment_failed': return 'status-payment-failed';
      default: return 'status-default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatOrderNumber = (order: any) => {
    const orderId = order?.id || order?.order_id;
    if (!orderId) return 'N/A';
    return `ORD-${orderId.toString().padStart(8, '0')}`;
  };

  if (loading) {
    return (
      <div className="orders-management">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-management">
      {/* Header */}
      <div className="orders-header">
        <h1>Orders Queue</h1>
        <p className="orders-subtitle">Manage customer orders and track deliveries</p>
        
        <div className="orders-stats">
          <span className="total-orders">Total Orders: {pagination.totalOrders}</span>
          <span className="filtered-orders">Showing: {filteredOrders.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="orders-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label>Status</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Customer Name/Email</label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.customerName}
              onChange={(e) => handleFilterChange('customerName', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Order ID</label>
            <input
              type="text"
              placeholder="Order ID or ORD-..."
              value={filters.orderId}
              onChange={(e) => handleFilterChange('orderId', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Price Range</label>
            <div className="price-range">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              />
            </div>
          </div>

          <button className="apply-filters-btn" onClick={handleApplyFilters}>
            Apply Filters
          </button>

          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Orders List */}
      <div className="orders-list">
        {!filteredOrders || filteredOrders.length === 0 ? (
          <div className="no-orders">
            <h3>No orders found</h3>
            <p>
              {!orders || orders.length === 0 
                ? "You don't have any orders yet." 
                : "No orders match your current filters."
              }
            </p>
          </div>
        ) : (
          filteredOrders.map(order => {
            if (!order) return null;
            const orderId = order?.id || order?.order_id;
            return (
              <div key={orderId || Math.random()} className="order-card">
                  
                  <div className="order-header">
                    <div className="order-info">
                      <h3 className="order-number">{formatOrderNumber(order)}</h3>
                      <p className="order-date">{order?.created_at ? formatDate(order.created_at) : 'Unknown date'}</p>
                    </div>
                    <div className="order-status">
                      <span className={`status-badge ${getStatusBadgeClass(order.status || 'pending')}`}>
                        {(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
                      </span>
                    </div>
                  </div>

              <div className="order-body">
                <div className="customer-info">
                  <h4>Customer Details</h4>
                  <p><strong>Name:</strong> {order.customer_name || 'N/A'}</p>
                  <p><strong>Email:</strong> {order.customer_email || 'N/A'}</p>
                  {order.shipping_address && order.shipping_address.phone && (
                    <p><strong>Phone:</strong> {order.shipping_address.phone}</p>
                  )}
                </div>

                <div className="order-summary">
                  <h4>Order Summary</h4>
                  <p><strong>Items:</strong> {order.items?.length || 0}</p>
                  <p><strong>Total:</strong> {formatCurrency(order.total_amount)}</p>
                </div>
              </div>

              <div className="order-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => openOrderDetails(order)}
                >
                  View Details
                </button>
                
                <div className="status-update">
                  <select 
                    value={order.status || 'pending'}
                    onChange={(e) => handleStatusUpdate(order, e.target.value)}
                    disabled={updateLoading}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="payment_failed">Payment Failed</option>
                  </select>
                  
                  {updateLoading && (
                    <div className="update-spinner">
                      <div className="spinner small"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button 
            disabled={pagination.currentPage === 1}
            onClick={() => fetchOrders(pagination.currentPage - 1)}
          >
            Previous
          </button>
          
          <span className="page-info">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          
          <button 
            disabled={pagination.currentPage === pagination.totalPages}
            onClick={() => fetchOrders(pagination.currentPage + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <div className="modal-overlay" onClick={closeOrderDetails}>
          <div className="modal-content order-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details - {formatOrderNumber(selectedOrder)}</h2>
              <button className="modal-close" onClick={closeOrderDetails}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="order-details-grid">
                <div className="customer-section">
                  <h3>Customer Information</h3>
                  <div className="info-group">
                    <p><strong>Name:</strong> {selectedOrder.customer_name}</p>
                    <p><strong>Email:</strong> {selectedOrder.customer_email}</p>
                    <p><strong>Order Date:</strong> {formatDate(selectedOrder.created_at)}</p>
                    <p><strong>Status:</strong> 
                      <span className={`status-badge ${getStatusBadgeClass(selectedOrder.status)}`}>
                        {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>

                {selectedOrder.shipping_address && (
                  <div className="shipping-section">
                    <h3>Shipping Address</h3>
                    <div className="address-details">
                      <p>{selectedOrder.shipping_address.full_name}</p>
                      <p>{selectedOrder.shipping_address.address_line1}</p>
                      {selectedOrder.shipping_address.address_line2 && (
                        <p>{selectedOrder.shipping_address.address_line2}</p>
                      )}
                      <p>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state}</p>
                      <p>{selectedOrder.shipping_address.postal_code}</p>
                      <p><strong>Phone:</strong> {selectedOrder.shipping_address.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="order-items-section">
                <h3>Order Items</h3>
                <div className="items-list">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="item-row">
                      <div className="item-image" style={{ marginRight: '12px' }}>
                        <img 
                          src={(() => {
                            // Handle products with JSONB images field
                            if (item.images && Array.isArray(item.images) && item.images.length > 0) {
                              const firstImage = item.images[0];
                              if (typeof firstImage === 'string') {
                                return firstImage.startsWith('http') ? firstImage : `http://localhost:5000${firstImage}`;
                              }
                              if (firstImage.url) {
                                return firstImage.url.startsWith('http') ? firstImage.url : `http://localhost:5000${firstImage.url}`;
                              }
                            }
                            // Handle products with single image_url field
                            if (item.image_url && typeof item.image_url === 'string') {
                              return item.image_url.startsWith('http') ? item.image_url : `http://localhost:5000${item.image_url}`;
                            }
                            return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" font-size="20" text-anchor="middle" dy=".3em" fill="%23999">No image</text></svg>';
                          })()} 
                          alt={item.product_name}
                          style={{ 
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '4px'
                          }}
                          onError={(e: any) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f0f0f0" width="100" height="100"/><text x="50" y="50" font-size="20" text-anchor="middle" dy=".3em" fill="%23999">No image</text></svg>';
                          }}
                        />
                      </div>
                      <div className="item-details">
                        <h4>{item.product_name}</h4>
                        <p>Product ID: {item.product_id}</p>
                        {item.selected_size && (
                          item.selected_size === 'One Size' ? (
                            item.selected_colour && item.selected_colour !== 'Default' && (
                              <p><strong>Colour:</strong> {item.selected_colour}</p>
                            )
                          ) : (
                            <>
                              <p><strong>Size:</strong> {item.selected_size}</p>
                              {item.selected_colour && item.selected_colour !== 'Default' && (
                                <p><strong>Colour:</strong> {item.selected_colour}</p>
                              )}
                            </>
                          )
                        )}
                      </div>
                      <div className="item-quantity">
                        <span>
                          Qty: {item.quantity}
                          {item.quantity_edited_by_seller && <span className="edit-marker" title="Quantity edited by seller"> ✏️</span>}
                        </span>
                      </div>
                      <div className="item-price">
                        <span>
                          {formatCurrency(item.price)}
                          {item.price_edited_by_seller && <span className="edit-marker" title="Price edited by seller"> ✏️</span>}
                        </span>
                      </div>
                      <div className="item-total">
                        <strong>{formatCurrency(item.total)}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="order-total">
                  <h3>Total Amount: {formatCurrency(selectedOrder.total_amount)}</h3>
                </div>
              </div>

              <div className="order-actions-modal">
                <h3>Update Order Status</h3>
                <div className="status-update-section">
                  <select 
                    value={selectedOrder.status || 'pending'}
                    onChange={(e) => handleStatusUpdate(selectedOrder, e.target.value)}
                    disabled={updateLoading}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  
                  {updateLoading && (
                    <div className="update-spinner">
                      <div className="spinner small"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersManagement;