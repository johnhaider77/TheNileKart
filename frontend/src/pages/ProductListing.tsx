import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { Product } from '../utils/types';
import QuickViewModal from '../components/QuickViewModal';

// Utility function to calculate actual available stock for products with sizes
const getActualStock = (product: Product): number => {
  // If product has sizes, sum up quantities from all sizes
  if (product.sizes && product.sizes.length > 0) {
    return product.sizes.reduce((total, size) => total + size.quantity, 0);
  }
  // Otherwise use the stock_quantity field
  return product.stock_quantity || 0;
};

// Utility function to get price display for products (considering size-specific pricing)
const getPriceDisplay = (product: Product): string => {
  // If product has sizes with prices, show price range or specific pricing
  if (product.sizes && product.sizes.length > 0) {
    const sizesWithPrices = product.sizes.filter(size => size.price !== undefined);
    
    if (sizesWithPrices.length > 0) {
      const prices = sizesWithPrices.map(size => size.price!);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      if (minPrice === maxPrice) {
        // All sizes have the same price
        return `AED ${minPrice.toFixed(2)}`;
      } else {
        // Show price range
        return `AED ${minPrice.toFixed(2)} - AED ${maxPrice.toFixed(2)}`;
      }
    }
  }
  
  // Fallback to base product price
  return `AED ${Number(product.price).toFixed(2)}`;
};

// Utility function to truncate product names for product listing display
const truncateProductName = (name: string, maxLength: number = 18): string => {
  if (name.length <= maxLength) {
    return name;
  }
  return name.substring(0, maxLength) + '...';
};

// Utility function to calculate % OFF for a product
const calculatePercentOff = (product: Product): number => {
  if (!product.market_price || product.market_price <= 0) {
    return 0; // No market price set, no discount to show
  }
  
  // For products with sizes, calculate the maximum % OFF among all sizes
  if (product.sizes && product.sizes.length > 0) {
    const sizesWithPrices = product.sizes.filter(size => size.price !== undefined && size.price > 0);
    
    if (sizesWithPrices.length > 0) {
      const discountPercentages = sizesWithPrices.map(size => {
        const sizePrice = size.price!;
        if (sizePrice < product.market_price!) {
          return ((product.market_price! - sizePrice) / product.market_price!) * 100;
        }
        return 0;
      });
      
      return Math.max(...discountPercentages);
    }
  }
  
  // For products without sizes, calculate based on base price
  if (product.price < product.market_price) {
    return ((product.market_price - product.price) / product.market_price) * 100;
  }
  
  return 0;
};

// Utility function to format % OFF display
const formatPercentOff = (percentOff: number): string | null => {
  if (percentOff > 0) {
    return `${Math.round(percentOff)}% OFF`;
  }
  return null;
};

// Responsive truncation hook
const useResponsiveTruncation = (name: string) => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
  
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return truncateProductName(name, isMobile ? 18 : 24);
};

const ProductListing: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    minPrice: '',
    maxPrice: ''
  });
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  
  const { addToCart } = useCart();
  const navigate = useNavigate();

  // Product name component with responsive truncation
  const ProductName: React.FC<{ name: string }> = ({ name }) => {
    const truncatedName = useResponsiveTruncation(name);
    return (
      <h3 className="product-name product-name-responsive">
        {truncatedName}
      </h3>
    );
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.minPrice) params.minPrice = parseFloat(filters.minPrice);
      if (filters.maxPrice) params.maxPrice = parseFloat(filters.maxPrice);
      
      const response = await productsAPI.getProducts(params);
      setProducts(response.data.products);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await productsAPI.getCategories();
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    // You could add a toast notification here
  };

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  const closeQuickView = () => {
    setIsQuickViewOpen(false);
    setQuickViewProduct(null);
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      search: '',
      minPrice: '',
      maxPrice: ''
    });
  };

  if (loading && products.length === 0) {
    return (
      <div className="page-container">
        <div className="container text-center">
          <div className="loading-spinner mx-auto"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Shop Products</h1>
          <p className="page-subtitle">Discover amazing products from our sellers</p>
        </div>

        {/* Filters */}
        <div className="filters-section card mb-4">
          <div className="card-body">
            <div className="filters-grid">
              <div className="form-group">
                <label htmlFor="search" className="form-label">Search</label>
                <input
                  type="text"
                  id="search"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  className="form-control"
                  placeholder="Search products..."
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="category" className="form-label">Category</label>
                <select
                  id="category"
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="form-control"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="minPrice" className="form-label">Min Price</label>
                <input
                  type="number"
                  id="minPrice"
                  name="minPrice"
                  value={filters.minPrice}
                  onChange={handleFilterChange}
                  className="form-control"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="maxPrice" className="form-label">Max Price</label>
                <input
                  type="number"
                  id="maxPrice"
                  name="maxPrice"
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                  className="form-control"
                  placeholder="Any"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="form-group">
                <button
                  onClick={clearFilters}
                  className="btn btn-outline"
                  style={{ marginTop: '1.5rem' }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="error-alert mb-4">
            {error}
          </div>
        )}

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="products-grid">
            {products.map(product => (
              <div key={product.id} className={`product-card card ${getActualStock(product) === 0 ? 'sold-out' : ''}`}>
                <div className="product-image-container">
                  {product.image_url && (
                    <div className="product-image">
                      <img 
                        src={`http://localhost:5000${product.image_url}`}
                        alt={product.name}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {getActualStock(product) === 0 && (
                    <div className="sold-out-overlay">
                      <div className="sold-out-watermark">
                        <span>SOLD OUT</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="card-body">
                  <div className="product-category">{product.category}</div>
                  <ProductName name={product.name} />
                  <div className="product-seller">
                    Sold by: {product.seller_name}
                  </div>
                  
                  <div className="product-footer">
                    <div className="product-price">
                      {getPriceDisplay(product)}
                      {formatPercentOff(calculatePercentOff(product)) && (
                        <span className="discount-badge">
                          {formatPercentOff(calculatePercentOff(product))}
                        </span>
                      )}
                    </div>
                    <div className="product-stock">
                      {getActualStock(product) > 0 ? (
                        <span className="text-success">
                          {getActualStock(product)} in stock
                        </span>
                      ) : (
                        <span className="text-error">Out of stock</span>
                      )}
                    </div>
                  </div>
                  
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="empty-state text-center">
              <h3>No products found</h3>
              <p>Try adjusting your filters or check back later</p>
            </div>
          )
        )}

        {/* Load More (if pagination needed) */}
        {loading && products.length > 0 && (
          <div className="text-center mt-4">
            <div className="loading-spinner mx-auto"></div>
            <p>Loading more products...</p>
          </div>
        )}
      </div>

      {/* QuickView Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={closeQuickView}
      />
    </div>
  );
};

export default ProductListing;