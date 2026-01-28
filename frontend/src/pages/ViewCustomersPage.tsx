import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sellerAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/ViewCustomers.css';

interface Customer {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  default_address: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    is_default: boolean;
  } | null;
}

const ViewCustomersPage: React.FC = () => {
  const { user, isAuthenticated, isSeller } = useAuth();
  const navigate = useNavigate();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });

  // Check authentication and authorization
  useEffect(() => {
    if (!isAuthenticated || !isSeller) {
      navigate('/seller/login');
    }
  }, [isAuthenticated, isSeller, navigate]);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📋 Fetching customers...');
        const response = await sellerAPI.getCustomers();
        
        console.log('✅ Customers fetched:', response.data.customers);
        setCustomers(response.data.customers || []);
        setFilteredCustomers(response.data.customers || []);
      } catch (err: any) {
        console.error('❌ Error fetching customers:', err);
        setError(err.response?.data?.message || 'Failed to fetch customers. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && isSeller) {
      fetchCustomers();
    }
  }, [isAuthenticated, isSeller]);

  // Handle search
  useEffect(() => {
    const filtered = customers.filter(customer => {
      const searchLower = searchTerm.toLowerCase();
      return (
        customer.full_name.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        (customer.phone && customer.phone.includes(searchLower)) ||
        (customer.default_address?.city && customer.default_address.city.toLowerCase().includes(searchLower))
      );
    });
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sort customers
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    let aValue: any = a[sortConfig.key as keyof Customer];
    let bValue: any = b[sortConfig.key as keyof Customer];

    if (sortConfig.key === 'created_at') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <span className="sort-icon">⇅</span>;
    return <span className="sort-icon">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  if (!isAuthenticated || !isSeller) {
    return null;
  }

  return (
    <div className="page-container view-customers-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">👥 Customer List</h1>
          <p className="page-subtitle">View all signed up customers on TheNileKart</p>
        </div>

        {/* Search Bar */}
        <div className="customers-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by name, email, phone, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          <div className="customer-count">
            Showing {sortedCustomers.length} of {customers.length} customers
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
            <p>Loading customers...</p>
          </div>
        )}

        {/* No Customers */}
        {!loading && sortedCustomers.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <h3>No Customers Found</h3>
            <p>
              {searchTerm 
                ? 'No customers match your search criteria.' 
                : 'No customers have signed up yet.'}
            </p>
          </div>
        )}

        {/* Customers Table */}
        {!loading && sortedCustomers.length > 0 && (
          <div className="customers-table-container">
            <table className="customers-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('full_name')}>
                    Name <SortIcon column="full_name" />
                  </th>
                  <th onClick={() => handleSort('email')}>
                    Email <SortIcon column="email" />
                  </th>
                  <th onClick={() => handleSort('phone')}>
                    Phone <SortIcon column="phone" />
                  </th>
                  <th>Default Address</th>
                  <th onClick={() => handleSort('created_at')}>
                    Joined <SortIcon column="created_at" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCustomers.map((customer) => (
                  <tr key={customer.id} className="customer-row">
                    <td className="customer-name">
                      <strong>{customer.full_name || 'N/A'}</strong>
                    </td>
                    <td className="customer-email">
                      <a href={`mailto:${customer.email}`}>{customer.email}</a>
                    </td>
                    <td className="customer-phone">
                      {customer.phone ? (
                        <a href={`tel:${customer.phone}`}>{customer.phone}</a>
                      ) : (
                        <span className="text-muted">Not provided</span>
                      )}
                    </td>
                    <td className="customer-address">
                      {customer.default_address ? (
                        <div className="address-info">
                          <div>{customer.default_address.address_line1}</div>
                          {customer.default_address.address_line2 && (
                            <div className="text-muted">{customer.default_address.address_line2}</div>
                          )}
                          <div className="text-muted">
                            {customer.default_address.city}, {customer.default_address.state} {customer.default_address.postal_code}
                          </div>
                          <div className="text-muted">{customer.default_address.country}</div>
                        </div>
                      ) : (
                        <span className="text-muted">No address provided</span>
                      )}
                    </td>
                    <td className="customer-joined">
                      {formatDate(customer.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats Footer */}
        {!loading && customers.length > 0 && (
          <div className="customers-stats">
            <div className="stat">
              <strong>Total Customers:</strong> {customers.length}
            </div>
            <div className="stat">
              <strong>With Address:</strong> {customers.filter(c => c.default_address).length}
            </div>
            <div className="stat">
              <strong>Without Address:</strong> {customers.filter(c => !c.default_address).length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewCustomersPage;
