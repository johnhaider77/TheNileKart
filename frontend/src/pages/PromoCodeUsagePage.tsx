import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sellerAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/PromoCodeUsage.css';

interface PromoUsageRecord {
  order_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  promo_code: string;
  order_total: number;
  amount_saved: number;
  order_date: string;
  status: string;
}

const PromoCodeUsagePage: React.FC = () => {
  const { user, isAuthenticated, isSeller } = useAuth();
  const navigate = useNavigate();
  
  const [records, setRecords] = useState<PromoUsageRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<PromoUsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'order_date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Check authentication and authorization
  useEffect(() => {
    if (!isAuthenticated || !isSeller) {
      navigate('/seller/login');
    }
  }, [isAuthenticated, isSeller, navigate]);

  // Fetch promo usage data
  useEffect(() => {
    const fetchPromoUsage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📊 Fetching promo code usage...');
        const response = await sellerAPI.getPromoCodeUsage(currentPage, 50);
        
        console.log('✅ Promo usage fetched:', response.data.data);
        setRecords(response.data.data || []);
        setFilteredRecords(response.data.data || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
      } catch (err: any) {
        console.error('❌ Error fetching promo usage:', err);
        setError(err.response?.data?.message || 'Failed to fetch promo code usage. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && isSeller) {
      fetchPromoUsage();
    }
  }, [isAuthenticated, isSeller, currentPage]);

  // Handle search
  useEffect(() => {
    const filtered = records.filter(record => {
      const searchLower = searchTerm.toLowerCase();
      return (
        record.customer_name.toLowerCase().includes(searchLower) ||
        record.customer_email.toLowerCase().includes(searchLower) ||
        (record.customer_phone && record.customer_phone.includes(searchLower)) ||
        record.promo_code.toLowerCase().includes(searchLower) ||
        record.order_id.toString().includes(searchLower)
      );
    });
    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sort records
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let aValue: any = a[sortConfig.key as keyof PromoUsageRecord];
    let bValue: any = b[sortConfig.key as keyof PromoUsageRecord];

    if (sortConfig.key === 'order_date') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (sortConfig.key === 'order_total' || sortConfig.key === 'amount_saved') {
      aValue = parseFloat(aValue);
      bValue = parseFloat(bValue);
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dubai'
    };
    return date.toLocaleDateString('en-US', options);
  };

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toFixed(2)}`;
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <span className="sort-icon">⇅</span>;
    return <span className="sort-icon">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  // Calculate statistics
  const totalSalesWithPromo = sortedRecords.length;
  const totalValueWithPromo = sortedRecords.reduce((sum, r) => sum + r.order_total, 0);
  const totalSavings = sortedRecords.reduce((sum, r) => sum + r.amount_saved, 0);

  if (!isAuthenticated || !isSeller) {
    return null;
  }

  return (
    <div className="page-container promo-usage-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">🎁 Promo Code Usage Report</h1>
          <p className="page-subtitle">View customers who purchased using promo codes (successful orders only)</p>
        </div>

        {/* Search Bar */}
        <div className="promo-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by name, email, phone, order ID, or promo code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          <div className="record-count">
            Showing {sortedRecords.length} of {records.length} orders
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center my-5">
            <div className="loading-spinner mx-auto"></div>
            <p>Loading promo code usage...</p>
          </div>
        )}

        {/* No Records */}
        {!loading && sortedRecords.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No Promo Code Usage Found</h3>
            <p>
              {searchTerm 
                ? 'No records match your search criteria.' 
                : 'No customers have used promo codes for successful purchases yet.'}
            </p>
          </div>
        )}

        {/* Promo Usage Table */}
        {!loading && sortedRecords.length > 0 && (
          <div className="promo-table-container">
            <table className="promo-usage-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('customer_name')}>
                    Customer Name <SortIcon column="customer_name" />
                  </th>
                  <th onClick={() => handleSort('customer_email')}>
                    Email <SortIcon column="customer_email" />
                  </th>
                  <th onClick={() => handleSort('customer_phone')}>
                    Contact <SortIcon column="customer_phone" />
                  </th>
                  <th onClick={() => handleSort('promo_code')}>
                    Promo Code <SortIcon column="promo_code" />
                  </th>
                  <th onClick={() => handleSort('order_id')}>
                    Order ID <SortIcon column="order_id" />
                  </th>
                  <th onClick={() => handleSort('order_date')}>
                    Order Date <SortIcon column="order_date" />
                  </th>
                  <th onClick={() => handleSort('order_total')}>
                    Order Value <SortIcon column="order_total" />
                  </th>
                  <th onClick={() => handleSort('amount_saved')}>
                    Amount Saved <SortIcon column="amount_saved" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record) => (
                  <tr key={record.order_id} className="promo-row">
                    <td className="customer-name">
                      <strong>{record.customer_name || 'N/A'}</strong>
                    </td>
                    <td className="customer-email">
                      <a href={`mailto:${record.customer_email}`}>{record.customer_email}</a>
                    </td>
                    <td className="customer-phone">
                      {record.customer_phone ? (
                        <a href={`tel:${record.customer_phone}`}>{record.customer_phone}</a>
                      ) : (
                        <span className="text-muted">Not provided</span>
                      )}
                    </td>
                    <td className="promo-code">
                      <span className="promo-badge">{record.promo_code}</span>
                    </td>
                    <td className="order-id">
                      <strong>#{record.order_id.toString().padStart(8, '0')}</strong>
                    </td>
                    <td className="order-date">
                      {formatDate(record.order_date)}
                    </td>
                    <td className="order-total">
                      <span className="value">{formatCurrency(record.order_total)}</span>
                    </td>
                    <td className="amount-saved">
                      <span className="savings">{formatCurrency(record.amount_saved)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Statistics Footer */}
        {!loading && sortedRecords.length > 0 && (
          <div className="promo-stats">
            <div className="stat">
              <strong>Total Orders with Promo:</strong> {totalSalesWithPromo}
            </div>
            <div className="stat">
              <strong>Total Sales Value:</strong> {formatCurrency(totalValueWithPromo)}
            </div>
            <div className="stat">
              <strong>Total Customer Savings:</strong> {formatCurrency(totalSavings)}
            </div>
            <div className="stat">
              <strong>Avg Discount per Order:</strong> {formatCurrency(totalSavings / totalSalesWithPromo)}
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="pagination-container">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromoCodeUsagePage;
