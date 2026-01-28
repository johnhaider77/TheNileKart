import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sellerAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LiveMetricsDashboard from '../components/LiveMetricsDashboard';
import '../styles/SellerDashboard.css';
import '../styles/FinancialOutlay.css';

// Utility function to calculate actual available stock for products with sizes
const getActualStock = (product: any): number => {
  // If product has sizes, sum up quantities from all sizes
  if (product.sizes && product.sizes.length > 0) {
    return product.sizes.reduce((total: number, size: any) => total + size.quantity, 0);
  }
  // Otherwise use the stock_quantity field
  return product.stock_quantity || 0;
};

interface Product {
  id: number;
  product_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock_quantity: number;
  sizes?: { size: string; quantity: number; price?: number; market_price?: number; actual_buy_price?: number; }[];
  image_url: string;
  images?: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Order {
  order_id: number;
  total_amount: number;
  status: string;
  shipping_address: any;
  created_at: string;
  customer_name: string;
  customer_email: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  products: Product[];
  orders: Order[];
  type: 'products' | 'orders' | 'financial';
  onRefreshData?: () => Promise<void>;
}

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  products, 
  orders, 
  type,
  onRefreshData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterProductId, setFilterProductId] = useState('');
  const [filterOrderIdOrEmail, setFilterOrderIdOrEmail] = useState('');
  const [filterOrderId, setFilterOrderId] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [otherProfitLoss, setOtherProfitLoss] = useState<{[key: string]: number}>({});
  const [originalValues, setOriginalValues] = useState<{[key: string]: any}>({});

  // Initialize otherProfitLoss state when orders are loaded or updated
  useEffect(() => {
    if (orders.length > 0) {
      const initialOtherProfitLoss: {[key: string]: number} = {};
      
      orders.forEach(order => {
        order.items.forEach(item => {
          const key = `${order.order_id}-${item.product_id}`;
          initialOtherProfitLoss[key] = Number((item as any).other_profit_loss || 0);
        });
      });
      
      console.log('Updating otherProfitLoss state with data from backend:', initialOtherProfitLoss);
      setOtherProfitLoss(initialOtherProfitLoss);
    }
  }, [orders]);

  // Initialize date range when modal opens for all modal types
  useEffect(() => {
    if (isOpen) {
      // Set default date range to last one month for all modals
      const today = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(today.getMonth() - 1);
      
      const formatDate = (date: Date) => {
        return date.getFullYear() + '-' + 
               String(date.getMonth() + 1).padStart(2, '0') + '-' + 
               String(date.getDate()).padStart(2, '0');
      };
      
      setFromDate(formatDate(lastMonth));
      setToDate(formatDate(today));
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  // Financial analysis data preparation
  const getFinancialData = () => {
    console.log('=== Financial Data Debug ===');
    console.log('All orders:', orders);
    console.log('All products:', products);
    
    // Get all orders regardless of status first
    const allOrderItems = orders.flatMap(order => 
      order.items.map(item => {
        console.log(`Processing order ${order.order_id}, item:`, item);
        
        // Find the product to get actual_buy_price - match by product_id string
        const product = products.find(p => p.product_id === item.product_id);
        console.log('Found product:', product);
        
        // Get actual buy price from product sizes or use a fallback
        let actualBuyPrice = 0;
        if (product?.sizes && product.sizes.length > 0) {
          actualBuyPrice = product.sizes[0].actual_buy_price || product.sizes[0].price || 0;
          console.log(`Product ${product.name}: actual_buy_price=${product.sizes[0].actual_buy_price}, price=${product.sizes[0].price}, using=${actualBuyPrice}`);
        } else {
          // Fallback: use 70% of selling price as estimated buy price
          actualBuyPrice = item.price * 0.7;
          console.log(`Product ${item.product_name}: No size data, using 70% fallback. Selling price=${item.price}, calculated buy price=${actualBuyPrice}`);
        }
        
        console.log(`Calculation: Selling price=${item.price}, Buy price=${actualBuyPrice}, Quantity=${item.quantity}`);
        console.log(`Profit per unit: ${item.price} - ${actualBuyPrice} = ${item.price - actualBuyPrice}`);
        
        let profitLoss = 0;
        let profitLossDisplay = 'N/A';
        
        // Calculate profit/loss only for delivered orders
        if (order.status === 'delivered') {
          profitLoss = (item.price - actualBuyPrice) * item.quantity;
          profitLossDisplay = profitLoss >= 0 
            ? `+AED ${profitLoss.toFixed(2)}` 
            : `-AED ${Math.abs(profitLoss).toFixed(2)}`;
          console.log(`Final profit/loss for ${item.product_name}: ${profitLoss}`);
        } else if (['shipped', 'pending', 'processing'].includes(order.status)) {
          profitLossDisplay = 'Pending Delivery';
        } else if (['cancelled', 'returned', 'payment_cancelled', 'payment_failed'].includes(order.status)) {
          profitLossDisplay = 'Cancelled/Returned';
        }

        return {
          orderId: order.order_id,
          orderDate: new Date(order.created_at).toLocaleString(),
          orderTimestamp: order.created_at, // Add original timestamp for filtering
          productId: item.product_id,
          productName: item.product_name,
          productPrice: item.price,
          actualBuyPrice: actualBuyPrice,
          quantity: item.quantity,
          profitLoss: profitLoss,
          profitLossDisplay: profitLossDisplay,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          orderStatus: order.status,
          // Edit markers for seller view
          priceEdited: (item as any).price_edited_by_seller || false,
          buyPriceEdited: (item as any).buy_price_edited_by_seller || false,
          quantityEdited: (item as any).quantity_edited_by_seller || false,
          otherProfitLossEdited: (item as any).other_profit_loss_edited_by_seller || false,
          editedAt: (item as any).edited_at || null
        };
      })
    );
    
    console.log('All order items processed:', allOrderItems);
    
    // Return all items (don't filter out cancelled/returned here - let user see all data)
    return allOrderItems;
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleEdit = (orderId: number, rowData: any) => {
    const itemKey = `${orderId}-${rowData.productId}`;
    setEditingOrderId(orderId);
    
    // Store original values for comparison
    setOriginalValues({
      ...originalValues,
      [itemKey]: {
        productPrice: rowData.productPrice,
        actualBuyPrice: rowData.actualBuyPrice,
        quantity: rowData.quantity,
        otherProfitLoss: otherProfitLoss[itemKey] || 0
      }
    });
    
    setEditForm({
      productId: rowData.productId,
      productPrice: rowData.productPrice,
      actualBuyPrice: rowData.actualBuyPrice,
      quantity: rowData.quantity,
      otherProfitLoss: otherProfitLoss[itemKey] || 0
    });
  };

  const handleSaveEdit = async () => {
    if (!editingOrderId) {
      alert('No order selected for editing');
      return;
    }
    
    try {
      // Call backend API to update order
      const updateData = {
        order_id: editingOrderId,
        product_price: editForm.productPrice,
        actual_buy_price: editForm.actualBuyPrice,
        quantity: editForm.quantity,
        other_profit_loss: editForm.otherProfitLoss,
        edited_by_seller: true,
        edited_at: new Date().toISOString()
      };
      
      console.log('Saving edit for order:', editingOrderId, updateData);
      
      // Make API call to update order
      await sellerAPI.updateOrderDetails(updateData);
      
      // Refresh data to show updated values - this will trigger the useEffect to update otherProfitLoss state
      if (onRefreshData) {
        await onRefreshData();
      }
      
      // Add a small delay to ensure the state is updated before clearing the form
      setTimeout(() => {
        setEditingOrderId(null);
        setEditForm({});
        
        // Show success message
        alert('Order updated successfully. Changes will be reflected across the website.');
      }, 100);
      
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
    setEditForm({});
  };

  let filteredData: any[] = [];
  
  if (type === 'financial') {
    const financialData = getFinancialData();
    filteredData = financialData.filter(item => {
      const matchesOrderIdOrEmail = filterOrderIdOrEmail === '' || 
                                   item.orderId.toString().includes(filterOrderIdOrEmail) ||
                                   item.customerEmail.toLowerCase().includes(filterOrderIdOrEmail.toLowerCase());
      
      // Date range filtering for financial data using original timestamp
      const matchesDate = (() => {
        if (!fromDate && !toDate) return true;
        
        const orderTimestamp = new Date(item.orderTimestamp);
        const fromDateObj = fromDate ? new Date(fromDate + 'T00:00:00') : null;
        const toDateObj = toDate ? new Date(toDate + 'T23:59:59') : null;
        
        if (fromDateObj && toDateObj) {
          return orderTimestamp >= fromDateObj && orderTimestamp <= toDateObj;
        } else if (fromDateObj) {
          return orderTimestamp >= fromDateObj;
        } else if (toDateObj) {
          return orderTimestamp <= toDateObj;
        }
        return true;
      })();
      
      return matchesOrderIdOrEmail && matchesDate;
    });

    // Apply sorting
    if (sortConfig) {
      filteredData.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
  } else {
    // Determine what data to filter based on modal title
    let sourceData: any[] = [];
    let isProductData = false;
    
    switch (title) {
      case 'Total Products':
        sourceData = products;
        isProductData = true;
        break;
      case 'Sold Out Products':
        sourceData = products.filter((p: any) => getActualStock(p) === 0);
        isProductData = true;
        break;
      case 'Products Delivered':
        sourceData = orders.filter((o: any) => o.status === 'delivered');
        isProductData = false;
        break;
      case 'Products Out for Delivery':
        sourceData = orders.filter((o: any) => o.status === 'shipped');
        isProductData = false;
        break;
      case 'Products Returned':
        sourceData = orders.filter((o: any) => o.status === 'cancelled');
        isProductData = false;
        break;
      default:
        sourceData = [];
        break;
    }
    
    if (isProductData) {
      // Handle product filtering (Total Products, Sold Out Products)
      filteredData = sourceData.filter((product: any) => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesProductId = filterProductId === '' || product.product_id.toString().includes(filterProductId);
        
        // Date range filtering for products using created_at timestamp
        const matchesDate = (() => {
          if (!fromDate && !toDate) return true;
          
          const productDate = new Date(product.created_at);
          const fromDateObj = fromDate ? new Date(fromDate + 'T00:00:00') : null;
          const toDateObj = toDate ? new Date(toDate + 'T23:59:59') : null;
          
          if (fromDateObj && toDateObj) {
            return productDate >= fromDateObj && productDate <= toDateObj;
          } else if (fromDateObj) {
            return productDate >= fromDateObj;
          } else if (toDateObj) {
            return productDate <= toDateObj;
          }
          return true;
        })();
        
        return matchesSearch && matchesProductId && matchesDate;
      });
    } else {
      // Handle order filtering (Pending Orders, Products Delivered, Out for Delivery, Products Returned)
      filteredData = sourceData.filter((order: any) => {
        const matchesSearch = order.items.some((item: any) => 
          item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
        ) || order.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesOrderId = filterOrderId === '' || order.order_id.toString().includes(filterOrderId);
        
        // Date range filtering for orders using created_at timestamp
        const matchesDate = (() => {
          if (!fromDate && !toDate) return true;
          
          const orderDate = new Date(order.created_at);
          const fromDateObj = fromDate ? new Date(fromDate + 'T00:00:00') : null;
          const toDateObj = toDate ? new Date(toDate + 'T23:59:59') : null;
          
          if (fromDateObj && toDateObj) {
            return orderDate >= fromDateObj && orderDate <= toDateObj;
          } else if (fromDateObj) {
            return orderDate >= fromDateObj;
          } else if (toDateObj) {
            return orderDate <= toDateObj;
          }
          return true;
        })();
        
        return matchesSearch && matchesOrderId && matchesDate;
      });
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content financial-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-filters">
          <div className="filter-row">
            <input
              type="date"
              placeholder="From Date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="form-control"
              title="From Date"
            />
            <input
              type="date"
              placeholder="To Date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="form-control"
              title="To Date"
            />
          </div>
          <div className="filter-row">
            {type === 'products' ? (
              <input
                type="text"
                placeholder="Product ID"
                value={filterProductId}
                onChange={(e) => setFilterProductId(e.target.value)}
                className="form-control"
              />
            ) : type === 'financial' ? (
              <input
                type="text"
                placeholder="Order ID or Customer Email"
                value={filterOrderIdOrEmail}
                onChange={(e) => setFilterOrderIdOrEmail(e.target.value)}
                className="form-control"
              />
            ) : (
              <input
                type="text"
                placeholder="Order ID"
                value={filterOrderId}
                onChange={(e) => setFilterOrderId(e.target.value)}
                className="form-control"
              />
            )}
          </div>
        </div>

        <div className="modal-body">
          {type === 'financial' ? (
            <div className="financial-outlay-section">
              <div className="financial-summary">
                <h3>Financial Analysis Summary</h3>
                <div className="summary-stats">
                  <div className="stat-item">
                    <span>Total Orders:</span>
                    <span>{filteredData.length}</span>
                  </div>
                  <div className="stat-item">
                    <span>Total Delivered Orders:</span>
                    <span>{filteredData.filter(item => item.orderStatus === 'delivered').length}</span>
                  </div>
                  <div className="stat-item">
                    <span>Total Profit/Loss:</span>
                    <span className={(filteredData.filter(item => item.orderStatus === 'delivered').reduce((total, item) => {
                      return total + item.profitLoss;
                    }, 0) + filteredData.reduce((total, item) => {
                      const otherProfitValue = otherProfitLoss[`${item.orderId}-${item.productId}`] || 0;
                      return total + otherProfitValue;
                    }, 0)) >= 0 ? 'profit' : 'loss'}>
                      {(filteredData.filter(item => item.orderStatus === 'delivered').reduce((total, item) => {
                        return total + item.profitLoss;
                      }, 0) + filteredData.reduce((total, item) => {
                        const otherProfitValue = otherProfitLoss[`${item.orderId}-${item.productId}`] || 0;
                        return total + otherProfitValue;
                      }, 0)) >= 0 ? '+' : ''}AED {(filteredData.filter(item => item.orderStatus === 'delivered').reduce((total, item) => {
                        return total + item.profitLoss;
                      }, 0) + filteredData.reduce((total, item) => {
                        const otherProfitValue = otherProfitLoss[`${item.orderId}-${item.productId}`] || 0;
                        return total + otherProfitValue;
                      }, 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="financial-table-container">
                <table className="financial-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('orderId')}>Order ID {sortConfig?.key === 'orderId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('orderDate')}>Order Date/Time {sortConfig?.key === 'orderDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('productId')}>Product ID {sortConfig?.key === 'productId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('productName')}>Product Name {sortConfig?.key === 'productName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('productPrice')}>Product Price {sortConfig?.key === 'productPrice' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('actualBuyPrice')}>Actual Buy Price {sortConfig?.key === 'actualBuyPrice' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('quantity')}>Quantity {sortConfig?.key === 'quantity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('profitLoss')}>Profit/Loss {sortConfig?.key === 'profitLoss' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('otherProfitLoss')}>Other Profit/Loss {sortConfig?.key === 'otherProfitLoss' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('customerName')}>Customer Name {sortConfig?.key === 'customerName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                      <th onClick={() => handleSort('customerEmail')}>Customer Email {sortConfig?.key === 'customerEmail' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={12} style={{ textAlign: 'center' }}>No financial data found</td>
                      </tr>
                    ) : (
                      filteredData.map((item, index) => (
                        <tr key={`${item.orderId}-${item.productId}-${index}`}>
                          <td>{item.orderId}</td>
                          <td>{item.orderDate}</td>
                          <td>{item.productId}</td>
                          <td>{item.productName}</td>
                          <td>
                            {editingOrderId === item.orderId ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.productPrice}
                                onChange={(e) => setEditForm({...editForm, productPrice: parseFloat(e.target.value)})}
                                className="edit-input"
                              />
                            ) : (
                              <span>
                                AED {item.productPrice}
                                {item.priceEdited && 
                                 <span className="edit-marker" title="Price edited by seller"> ✏️</span>}
                              </span>
                            )}
                          </td>
                          <td>
                            {editingOrderId === item.orderId ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.actualBuyPrice}
                                onChange={(e) => setEditForm({...editForm, actualBuyPrice: parseFloat(e.target.value)})}
                                className="edit-input"
                              />
                            ) : (
                              <span>
                                AED {item.actualBuyPrice}
                                {item.buyPriceEdited && 
                                 <span className="edit-marker" title="Buy price edited by seller"> ✏️</span>}
                              </span>
                            )}
                          </td>
                          <td>
                            {editingOrderId === item.orderId ? (
                              <input
                                type="number"
                                value={editForm.quantity}
                                onChange={(e) => setEditForm({...editForm, quantity: parseInt(e.target.value)})}
                                className="edit-input"
                              />
                            ) : (
                              <span>
                                {item.quantity}
                                {item.quantityEdited && 
                                 <span className="edit-marker" title="Quantity edited by seller"> ✏️</span>}
                              </span>
                            )}
                          </td>
                          <td className={item.profitLoss >= 0 ? 'profit' : 'loss'}>
                            {editingOrderId === item.orderId ? (
                              `${(editForm.productPrice - editForm.actualBuyPrice) * editForm.quantity >= 0 ? '+' : ''}AED ${((editForm.productPrice - editForm.actualBuyPrice) * editForm.quantity).toFixed(2)}`
                            ) : (
                              item.profitLossDisplay
                            )}
                          </td>
                          <td>
                            {editingOrderId === item.orderId ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editForm.otherProfitLoss}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  otherProfitLoss: parseFloat(e.target.value) || 0
                                })}
                                className="edit-input other-profit-input"
                                placeholder="0.00"
                              />
                            ) : (
                              <span>
                                AED {(otherProfitLoss[`${item.orderId}-${item.productId}`] || 0).toFixed(2)}
                                {item.otherProfitLossEdited && 
                                 <span className="edit-marker" title="Other profit/loss edited by seller"> ✏️</span>}
                              </span>
                            )}
                          </td>
                          <td>{item.customerName}</td>
                          <td>{item.customerEmail}</td>
                          <td>
                            {editingOrderId === item.orderId ? (
                              <div className="edit-actions">
                                <button onClick={handleSaveEdit} className="save-btn">Save</button>
                                <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleEdit(item.orderId, item)} 
                                className="edit-btn"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : type === 'products' ? (
            <div className="products-list">
              {filteredData.length === 0 ? (
                <p>No products found</p>
              ) : (
                filteredData.map((product: any) => (
                  <div key={product.id} className="product-item">
                    <div className="product-info">
                      <h4>{product.name}</h4>
                      <p>ID: {product.product_id} | Price: AED {product.price} | Stock: {product.stock_quantity}</p>
                      <p>Status: {product.is_active ? 'Active' : 'Inactive'}</p>
                      <p>Created: {new Date(product.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="orders-list">
              {filteredData.length === 0 ? (
                <p>No orders found</p>
              ) : (
                filteredData.map((order: any) => (
                  <div key={order.order_id} className="order-item">
                    <div className="order-header">
                      <h4>Order #{order.order_id}</h4>
                      <span className={`status-badge status-${order.status}`}>{order.status}</span>
                    </div>
                    <p>Customer: {order.customer_name} ({order.customer_email})</p>
                    <p>Total: AED {order.total_amount}</p>
                    <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
                    <div className="order-items">
                      {order.items.map((item: any, index: number) => (
                        <div key={index} className="order-item-detail" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div 
                            style={{
                              width: '64px',
                              height: '64px',
                              minWidth: '64px',
                              minHeight: '64px',
                              borderRadius: '4px',
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
                                // Fallback placeholder
                                return 'https://via.placeholder.com/64';
                              })()}
                              alt={item.product_name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover' as const,
                                display: 'block'
                              }}
                              onError={(e: any) => {
                                e.target.src = 'https://via.placeholder.com/64';
                              }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div><strong>{item.product_name}</strong></div>
                            {item.selected_size && (
                              item.selected_size === 'One Size' ? (
                                item.selected_colour && item.selected_colour !== 'Default' && (
                                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Colour: {item.selected_colour}</div>
                                )
                              ) : (
                                <>
                                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Size: {item.selected_size}</div>
                                  {item.selected_colour && item.selected_colour !== 'Default' && (
                                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Colour: {item.selected_colour}</div>
                                  )}
                                </>
                              )
                            )}
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Qty: {item.quantity} - AED {item.total}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SellerDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    soldOutProducts: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    deliveredProducts: 0,
    outForDeliveryProducts: 0,
    returnedProducts: 0
  });
  const [loading, setLoading] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    type: 'products' as 'products' | 'orders' | 'financial'
  });
  const [isMetricsDashboardExpanded, setIsMetricsDashboardExpanded] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch products and orders data
      const [productsResponse, ordersResponse] = await Promise.all([
        sellerAPI.getSellerProducts({ limit: 100 }),
        sellerAPI.getSellerOrders({ limit: 100 })
      ]);

      const products = productsResponse.data.products;
      
      const orders = ordersResponse.data.orders.map((order: any) => ({
        ...order,
        shipping_address: typeof order.shipping_address === 'string' 
          ? JSON.parse(order.shipping_address) 
          : order.shipping_address
      }));

      setAllProducts(products);
      setAllOrders(orders);

      // Calculate delivered products (count of unique products in delivered orders)
      const deliveredOrders = orders.filter((o: any) => o.status === 'delivered');
      const deliveredProductCount = deliveredOrders.reduce((count: number, order: any) => {
        return count + order.items.length;
      }, 0);

      // Calculate out for delivery products (count of unique products in shipped orders)
      const shippedOrders = orders.filter((o: any) => o.status === 'shipped');
      const outForDeliveryProductCount = shippedOrders.reduce((count: number, order: any) => {
        return count + order.items.length;
      }, 0);

      // Calculate returned products (count of unique products in cancelled orders)
      const returnedOrders = orders.filter((o: any) => o.status === 'cancelled');
      const returnedProductCount = returnedOrders.reduce((count: number, order: any) => {
        return count + order.items.length;
      }, 0);

      setStats({
        totalProducts: products.length,
        soldOutProducts: products.filter((p: any) => getActualStock(p) === 0).length,
        pendingOrders: orders.filter((o: any) => o.status === 'pending' || o.status === 'processing').length,
        totalRevenue: orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_amount || 0), 0),
        deliveredProducts: deliveredProductCount,
        outForDeliveryProducts: outForDeliveryProductCount,
        returnedProducts: returnedProductCount
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: 'products' | 'orders' | 'financial', title: string) => {
    // For Pending Orders, navigate to orders page with pending filter
    if (title === 'Pending Orders') {
      navigate('/seller/orders?status=pending');
      return;
    }
    
    // For Products Delivered, navigate to orders page with delivered filter
    if (title === 'Products Delivered') {
      navigate('/seller/orders?status=delivered');
      return;
    }
    
    // For Products Out for Delivery, navigate to orders page with shipped filter
    if (title === 'Products Out for Delivery') {
      navigate('/seller/orders?status=shipped');
      return;
    }
    
    // For Products Returned, navigate to orders page with cancelled filter
    if (title === 'Products Returned') {
      navigate('/seller/orders?status=cancelled');
      return;
    }
    
    setModalState({
      isOpen: true,
      title,
      type
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      title: '',
      type: 'products'
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="container text-center">
          <div className="loading-spinner mx-auto"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container seller-dashboard">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Seller Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.full_name}</p>
        </div>

        {/* Stats Cards */}
        <div className="dashboard-stats">
          <div className="stat-card card compact-card clickable-card" onClick={() => openModal('products', 'Total Products')}>
            <div className="card-body text-center">
              <div className="stat-icon">📦</div>
              <h3 className="stat-number clickable-number">{stats.totalProducts}</h3>
              <p className="stat-label">Total Products</p>
            </div>
          </div>
          
          <div className="stat-card card compact-card clickable-card" onClick={() => openModal('products', 'Sold Out Products')}>
            <div className="card-body text-center">
              <div className="stat-icon">❌</div>
              <h3 className="stat-number clickable-number">{stats.soldOutProducts}</h3>
              <p className="stat-label">Sold Out Products</p>
            </div>
          </div>
          
          <div className="stat-card card compact-card clickable-card" onClick={() => openModal('orders', 'Pending Orders')}>
            <div className="card-body text-center">
              <div className="stat-icon">⏳</div>
              <h3 className="stat-number clickable-number">{stats.pendingOrders}</h3>
              <p className="stat-label">Pending Orders</p>
            </div>
          </div>
          
          <div className="stat-card card compact-card clickable-card" onClick={() => openModal('financial', 'Financial Outlay')}>
            <div className="card-body text-center">
              <div className="stat-icon">💰</div>
              <h3 className="stat-number clickable-number">Click to View</h3>
              <p className="stat-label">Financial Outlay</p>
            </div>
          </div>

          <div className="stat-card card compact-card clickable-card" onClick={() => openModal('orders', 'Products Delivered')}>
            <div className="card-body text-center">
              <div className="stat-icon">🚚</div>
              <h3 className="stat-number clickable-number">{stats.deliveredProducts}</h3>
              <p className="stat-label">Products Delivered</p>
            </div>
          </div>

          <div className="stat-card card compact-card clickable-card" onClick={() => openModal('orders', 'Products Out for Delivery')}>
            <div className="card-body text-center">
              <div className="stat-icon">📫</div>
              <h3 className="stat-number clickable-number">{stats.outForDeliveryProducts}</h3>
              <p className="stat-label">Out for Delivery</p>
            </div>
          </div>

          <div className="stat-card card compact-card clickable-card" onClick={() => openModal('orders', 'Products Returned')}>
            <div className="card-body text-center">
              <div className="stat-icon">↩️</div>
              <h3 className="stat-number clickable-number">{stats.returnedProducts}</h3>
              <p className="stat-label">Products Returned</p>
            </div>
          </div>
        </div>

        {/* Live Customer Metrics Section */}
        <div className="live-metrics-section">
          <div 
            className="metrics-header" 
            onClick={() => setIsMetricsDashboardExpanded(!isMetricsDashboardExpanded)}
            style={{ cursor: 'pointer', padding: '1rem', border: '1px solid #e1e5e9', borderRadius: '8px', backgroundColor: '#f8f9fa' }}
          >
            <h2 className="section-title" style={{ margin: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              📊 Live Customer Metrics Dashboard
              <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>
                {isMetricsDashboardExpanded ? '▼' : '▶'}
              </span>
            </h2>
            <p className="section-subtitle" style={{ margin: '0.5rem 0 0 0', color: '#6c757d' }}>
              {isMetricsDashboardExpanded 
                ? 'Real-time tracking of customer activity across your website' 
                : 'Click to expand and view real-time customer metrics'}
            </p>
          </div>
          {isMetricsDashboardExpanded && (
            <div className="metrics-container" style={{ marginTop: '1rem' }}>
              <LiveMetricsDashboard />
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2 className="mb-4">Quick Actions</h2>
          <div className="actions-grid grid grid-cols-1 grid-cols-md-5">
            <Link to="/seller/create-product" className="action-card card">
              <div className="card-body text-center">
                <div className="action-icon">+</div>
                <h3>Add New Product</h3>
                <p>Create a new product listing</p>
              </div>
            </Link>
            
            <Link to="/seller/inventory" className="action-card card">
              <div className="card-body text-center">
                <div className="action-icon">📦</div>
                <h3>Manage Inventory</h3>
                <p>Update your product inventory</p>
              </div>
            </Link>
            
            <Link to="/seller/banners" className="action-card card">
              <div className="card-body text-center">
                <div className="action-icon">🎯</div>
                <h3>Manage Banners</h3>
                <p>Create offers and banners</p>
              </div>
            </Link>
            
            <Link to="/seller/promo-codes" className="action-card card">
              <div className="card-body text-center">
                <div className="action-icon">🎁</div>
                <h3>Manage Promo Codes</h3>
                <p>Create discount promo codes</p>
              </div>
            </Link>
            
            <Link to="/seller/orders" className="action-card card">
              <div className="card-body text-center">
                <div className="action-icon">📋</div>
                <h3>View Orders</h3>
                <p>Check pending orders</p>
              </div>
            </Link>

            <Link to="/seller/customers" className="action-card card">
              <div className="card-body text-center">
                <div className="action-icon">👥</div>
                <h3>View Customers</h3>
                <p>See all signed up customers</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Product Details Modal */}
        <ProductDetailsModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={modalState.title}
          products={allProducts}
          orders={allOrders}
          type={modalState.type}
          onRefreshData={fetchDashboardData}
        />
      </div>
    </div>
  );
};

export default SellerDashboard;