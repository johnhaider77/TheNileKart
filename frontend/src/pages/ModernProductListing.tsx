import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { productsAPI, sellerAPI } from '../services/api';
import { useCart } from '../context/CartContext';
import { Product } from '../utils/types';
import { CATEGORY_NAMES } from '../utils/categories';
import { useMetrics } from '../hooks/useMetrics';
import QuickViewModal from '../components/QuickViewModal';
import ImageCarousel from '../components/ImageCarousel';
import BannerCarousel from '../components/BannerCarousel';
import '../styles/global.css';

// Utility function to calculate actual available stock for products with sizes
const getActualStock = (product: Product): number => {
  // If product has sizes, sum up quantities from all sizes
  if (product.sizes && product.sizes.length > 0) {
    return product.sizes.reduce((total, size) => total + size.quantity, 0);
  }
  // Otherwise use the stock_quantity field
  return product.stock_quantity || 0;
};

// Utility function to calculate % OFF for a product
const calculatePercentOff = (product: Product): number => {
  // For products with sizes, calculate the maximum % OFF among all sizes that have stock
  if (product.sizes && product.sizes.length > 0) {
    const availableSizes = product.sizes.filter(size => 
      size.price !== undefined && 
      size.price > 0 && 
      size.quantity > 0  // Only consider sizes with stock
    );
    
    if (availableSizes.length > 0) {
      const discountPercentages = availableSizes.map(size => {
        const sizePrice = Number(size.price!);
        const sizeMarketPrice = size.market_price ? Number(size.market_price) : 0;
        
        if (sizeMarketPrice > 0 && sizePrice < sizeMarketPrice) {
          const percentOff = ((sizeMarketPrice - sizePrice) / sizeMarketPrice) * 100;
          return percentOff;
        }
        return 0;
      });
      
      const maxDiscount = Math.max(...discountPercentages);
      return maxDiscount;
    }
  }
  
  // For products without sizes, calculate based on base price and product market price
  const productMarketPrice = product.market_price ? Number(product.market_price) : 0;
  if (!productMarketPrice || productMarketPrice <= 0) {
    return 0; // No market price set, no discount to show
  }
  
  const basePrice = Number(product.price);
  if (basePrice < productMarketPrice) {
    const percentOff = ((productMarketPrice - basePrice) / productMarketPrice) * 100;
    return percentOff;
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

// Utility function to get price display for products (considering size-specific pricing)
const getPriceDisplay = (product: Product): React.JSX.Element => {
  // If product has sizes with prices, show price range or specific pricing
  if (product.sizes && product.sizes.length > 0) {
    const sizesWithPrices = product.sizes.filter(size => size.price !== undefined);
    
    if (sizesWithPrices.length > 0) {
      const prices = sizesWithPrices.map(size => size.price!);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      if (minPrice === maxPrice) {
        // All sizes have the same price
        return (
          <span className="flex items-center gap-1" style={{ color: '#db2777' }}>
            {minPrice.toFixed(2)}
          </span>
        );
      } else {
        // Show from lowest price instead of price range
        return (
          <span className="flex items-center gap-1" style={{ color: '#db2777' }}>
            From {minPrice.toFixed(2)}
          </span>
        );
      }
    }
  }
  
  // Fallback to base product price
  return (
    <span className="flex items-center gap-1" style={{ color: '#db2777' }}>
      {Number(product.price).toFixed(2)}
    </span>
  );
};

// Utility function to truncate product names for product listing display
const truncateProductName = (name: string, maxLength: number = 18): string => {
  if (name.length <= maxLength) {
    return name;
  }
  return name.substring(0, maxLength) + '...';
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

// Footer Component for E-commerce
const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <img src="/TheNileKart.jpeg" alt="TheNileKart" className="footer-logo-img" />
              <h3>TheNileKart</h3>
            </div>
            <p>Your trusted marketplace for quality products from around the world.</p>
            <div className="social-links">
              <span>📧</span>
              <span>📱</span>
              <span>🐦</span>
              <span>📘</span>
            </div>
          </div>
          
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li>About Us</li>
              <li>Contact</li>
              <li>FAQ</li>
              <li>Support</li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Categories</h4>
            <ul>
              <li>Mobiles & Tablets</li>
              <li>Electronics</li>
              <li>Fashion</li>
              <li>Home & Kitchen</li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4>Customer Service</h4>
            <ul>
              <li>Shipping Info</li>
              <li>Returns</li>
              <li>Order Tracking</li>
              <li>Size Guide</li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2025 TheNileKart. All rights reserved.</p>
          <div className="footer-links">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const ModernProductListing: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || ''
  });
  
  // Initialize metrics tracking - detect if this is a category page
  const currentCategory = filters.category;
  const { trackCategoryPage } = useMetrics({ 
    pageType: currentCategory ? 'category' : 'product_listing', 
    pageIdentifier: currentCategory 
  });
  
  const [priceSort, setPriceSort] = useState<'none' | 'asc' | 'desc'>(
    (searchParams.get('priceSort') as 'none' | 'asc' | 'desc') || 'none'
  );
  const [animatingProduct, setAnimatingProduct] = useState<number | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [showSizeSelectionPopup, setShowSizeSelectionPopup] = useState(false);
  const [popupProduct, setPopupProduct] = useState<Product | null>(null);

  const { addToCart } = useCart();
  const navigate = useNavigate();

  // Helper function to check if product has multiple available sizes
  const hasMultipleSizes = (product: Product): boolean => {
    if (!product.sizes || !Array.isArray(product.sizes)) {
      return false;
    }
    // Count sizes with stock > 0
    const availableSizes = product.sizes.filter(size => size.quantity > 0);
    return availableSizes.length > 1;
  };

  // Product name component with responsive truncation
  const ProductName: React.FC<{ name: string }> = ({ name }) => {
    const truncatedName = useResponsiveTruncation(name);
    return (
      <h3 className="font-semibold mb-1 product-title product-title-responsive" style={{ minHeight: 'auto', maxHeight: 'auto', height: 'auto' }}>
        {truncatedName}
      </h3>
    );
  };  // Fly to cart animation function
  const flyToCart = (productElement: HTMLElement, productImage: string) => {
    // Find the visible cart icon - check both mobile and desktop layouts
    let cartIcon: Element | null = null;
    
    // First check for mobile cart button
    const mobileCartBtn = document.querySelector('.mobile-cart-btn') as HTMLElement;
    if (mobileCartBtn && mobileCartBtn.offsetParent !== null) {
      cartIcon = mobileCartBtn;
    }
    
    // If mobile cart not visible, check for desktop cart
    if (!cartIcon) {
      const desktopCartBtn = document.querySelector('.cart-link') as HTMLElement;
      if (desktopCartBtn && desktopCartBtn.offsetParent !== null) {
        cartIcon = desktopCartBtn;
      }
    }
    
    // Fallback selectors if neither is found/visible
    if (!cartIcon) {
      cartIcon = document.querySelector('[title*="Cart"]') ||
                document.querySelector('button[title="Add to Cart"]') ||
                document.querySelector('.navbar .btn');
    }
    
    if (!cartIcon) return;

    const productRect = productElement.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();
    
    // Create animated element
    const flyingElement = document.createElement('div');
    flyingElement.innerHTML = `<img src="${productImage}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);" />`;
    flyingElement.style.cssText = `
      position: fixed;
      left: ${productRect.left + productRect.width / 2 - 25}px;
      top: ${productRect.top + productRect.height / 2 - 25}px;
      width: 50px;
      height: 50px;
      z-index: 9999;
      transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      pointer-events: none;
    `;
    
    document.body.appendChild(flyingElement);
    
    // Trigger animation
    requestAnimationFrame(() => {
      flyingElement.style.left = `${cartRect.left + cartRect.width / 2 - 25}px`;
      flyingElement.style.top = `${cartRect.top + cartRect.height / 2 - 25}px`;
      flyingElement.style.transform = 'scale(0.3)';
      flyingElement.style.opacity = '0';
    });
    
    // Remove element after animation
    setTimeout(() => {
      if (document.body.contains(flyingElement)) {
        document.body.removeChild(flyingElement);
      }
    }, 800);
  };

  useEffect(() => {
    // Reset pagination and reload products when filters change
    setPage(1);
    setProducts([]);
    setHasMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchCategories();
  }, [filters.category, filters.search, filters.minPrice, filters.maxPrice, priceSort]);

  const fetchProducts = async (isNewSearch = false) => {
    try {
      const isFirstLoad = isNewSearch || page === 1;
      
      if (isFirstLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const currentPage = isNewSearch ? 1 : page;
      const limit = isNewSearch ? 20 : 6; // 20 for initial load, 6 for subsequent loads
      
      const params: any = { 
        limit,
        page: currentPage
      };
      
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.minPrice) params.minPrice = parseFloat(filters.minPrice);
      if (filters.maxPrice) params.maxPrice = parseFloat(filters.maxPrice);
      
      const response = await productsAPI.getProducts(params);
      let newProducts = response.data.products;
      
      // Apply price sorting if selected
      if (priceSort !== 'none') {
        newProducts = [...newProducts].sort((a, b) => {
          const priceA = a.price || 0;
          const priceB = b.price || 0;
          return priceSort === 'asc' ? priceA - priceB : priceB - priceA;
        });
      }
      
      if (isNewSearch) {
        setProducts(newProducts);
        setPage(2); // Set to 2 since we just loaded page 1
      } else {
        setProducts(prev => [...prev, ...newProducts]);
        setPage(prev => prev + 1);
      }
      
      // Check if there are more products to load
      setHasMore(newProducts.length === limit);
      
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await productsAPI.getCategories();
      setCategories(response.data.categories);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  };

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000 && // Trigger 1000px before bottom
        hasMore &&
        !loading &&
        !loadingMore
      ) {
        fetchProducts(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, loadingMore, page]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const clearFilters = () => {
    setFilters({ category: '', search: '', minPrice: '', maxPrice: '' });
    setPriceSort('none');
  };

  const handlePriceSortToggle = () => {
    if (priceSort === 'none') {
      setPriceSort('asc'); // Low to High
    } else if (priceSort === 'asc') {
      setPriceSort('desc'); // High to Low
    } else {
      setPriceSort('none'); // No sorting
    }
  };

  const handleAddToCart = async (product: Product | any, event?: React.MouseEvent<HTMLButtonElement>) => {
    try {
      console.log('🛒 Add to cart clicked for product:', product.name);
      console.log('🔍 Product sizes:', product.sizes);
      console.log('🔍 hasMultipleSizes result:', hasMultipleSizes(product));
      
      // Check if product has multiple available sizes
      if (hasMultipleSizes(product)) {
        setPopupProduct(product);
        setShowSizeSelectionPopup(true);
        return;
      }

      console.log('✅ Proceeding with direct add to cart for:', product.name);
      setAnimatingProduct(product.id);
      
      // Get the product element and image for animation
      if (event) {
        const button = event.currentTarget;
        const productCard = button.closest('.card');
        const productImage = productCard?.querySelector('img')?.src || '';
        
        if (productCard) {
          flyToCart(productCard as HTMLElement, productImage);
        }
      }
      
      // Transform product to include image_url for cart display
      const productForCart = {
        ...product,
        image_url: product.images && product.images.length > 0 ? product.images[0] : product.image_url || 'https://via.placeholder.com/150'
      };
      
      await addToCart(productForCart, 1);
      
      // Reset animation state after a delay
      setTimeout(() => {
        setAnimatingProduct(null);
      }, 800);
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      setAnimatingProduct(null);
    }
  };

  // QuickView handler
  const handleQuickView = (product: any) => {
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  const closeQuickView = () => {
    setIsQuickViewOpen(false);
    setQuickViewProduct(null);
  };
  const closeSizePopup = () => {
    setShowSizeSelectionPopup(false);
    setPopupProduct(null);
  };

  const handleOpenQuickViewFromPopup = () => {
    if (popupProduct) {
      setQuickViewProduct(popupProduct);
      setIsQuickViewOpen(true);
      closeSizePopup();
    }
  };
  // Image carousel functionality will be handled by the imported ImageCarousel component

  if (loading && products.length === 0) {
    return (
      <div className="container py-8">
        <div className="animate-fadeIn">
          {/* Header Skeleton */}
          <div className="mb-8 text-center">
            <div className="loading-skeleton h-8 w-64 mx-auto mb-4"></div>
            <div className="loading-skeleton h-4 w-48 mx-auto"></div>
          </div>
          
          {/* Filters Skeleton */}
          <div className="card card-modern mb-8">
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="loading-skeleton h-12"></div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Products Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card">
                <div className="loading-skeleton h-48 mb-4"></div>
                <div className="p-4">
                  <div className="loading-skeleton h-6 mb-2"></div>
                  <div className="loading-skeleton h-4 w-3/4 mb-4"></div>
                  <div className="loading-skeleton h-10"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 animate-fadeIn">
      {/* Banner Carousel */}
      <BannerCarousel />

      {/* Modern Filters */}
      <div className="card card-modern card-glow mb-6">
        <div className="card-body py-2">
          <div className="filters-mobile-container">
            {/* Search */}
            <div className="filter-item search-item">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                name="search"
                placeholder="Search"
                className="mobile-filter-input"
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>

            {/* Category */}
            <select
              name="category"
              className="mobile-filter-select"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="">All</option>
              {CATEGORY_NAMES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Price Sort */}
            <button
              className="mobile-price-sort-btn"
              onClick={handlePriceSortToggle}
              type="button"
            >
              <span className="sort-text">Price</span>
              <span className="sort-arrows">
                {priceSort === 'none' && '⇅'}
                {priceSort === 'asc' && '↑'}
                {priceSort === 'desc' && '↓'}
              </span>
            </button>
            
            <button 
              onClick={clearFilters}
              className="mobile-clear-btn"
              title="Clear"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full mb-4"
               style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Oops! Something went wrong</h3>
          <p style={{ color: 'var(--text-secondary)' }} className="mb-4">{error}</p>
          <button onClick={() => fetchProducts(true)} className="btn btn-primary">
            Try Again
          </button>
        </div>
      )}

      {/* Products Grid */}
      {!error && (
        <>
          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p style={{ color: 'var(--text-secondary)' }}>
              {products.length} product{products.length !== 1 ? 's' : ''} found
            </p>
            {loading && (
              <div className="flex items-center gap-2">
                <div className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>
              </div>
            )}
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full mb-6"
                   style={{ background: 'var(--background-surface)' }}>
                <span className="text-4xl">🔍</span>
              </div>
              <h3 className="text-2xl font-semibold mb-4">No products found</h3>
              <p style={{ color: 'var(--text-secondary)' }} className="mb-6">
                Try adjusting your search or filter criteria
              </p>
              <button onClick={clearFilters} className="btn btn-accent">
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product: any) => (
                <div
                  key={product.id}
                  className="card card-product"
                  onClick={() => handleQuickView(product)}
                  style={{ 
                    position: 'relative',
                    opacity: (product.stock_quantity || 0) === 0 ? '0.6' : '1',
                    filter: (product.stock_quantity || 0) === 0 ? 'grayscale(50%)' : 'none',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                >
                  <ImageCarousel 
                    images={(() => {
                      // Handle database products with JSONB images field
                      if (product.images && Array.isArray(product.images)) {
                        const imageUrls = product.images.map((img: any) => {
                          if (typeof img === 'string') {
                            return img;
                          }
                          if (img.url) {
                            // Add localhost prefix if URL doesn't start with http
                            const fullUrl = img.url.startsWith('http') ? img.url : `http://localhost:5000${img.url}`;
                            return fullUrl;
                          }
                          return img;
                        });
                        return imageUrls.length > 0 ? imageUrls : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop'];
                      }
                      // Handle database products with single image_url
                      if (product.image_url) {
                        const imageUrl = product.image_url.startsWith('http') ? product.image_url : `http://localhost:5000${product.image_url}`;
                        console.log('Single image URL for', product.name, ':', imageUrl);
                        return [imageUrl];
                      }
                      // Fallback image
                      console.log('Using fallback image for', product.name);
                      return ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop'];
                    })()} 
                    productName={product.name} 
                  />
                  
                  {/* Sold Out Watermark */}
                  {getActualStock(product) === 0 && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                        borderRadius: '12px 12px 0 0', // Match image border radius
                        pointerEvents: 'none'
                      }}
                    >
                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.95), rgba(238, 90, 82, 0.95))',
                          color: 'white',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '1.5px',
                          border: '2px solid rgba(255, 255, 255, 0.9)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                          textAlign: 'center',
                          transform: 'rotate(-12deg)',
                          backdropFilter: 'blur(3px)',
                          position: 'relative',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        SOLD OUT
                      </div>
                    </div>
                  )}

                  {/* Product Info */}
                  <div className="card-body" style={{ padding: '6px 4px' }}>
                    <ProductName name={product.name} />
                    
                    <div className="flex items-center gap-1 mb-2" style={{ flexWrap: 'nowrap', overflow: 'hidden' }}>
                      <span className="font-bold flex-shrink-0" style={{ fontSize: '11px', minWidth: 'auto' }}>
                        {getPriceDisplay(product)}
                      </span>
                      {formatPercentOff(calculatePercentOff(product)) && (
                        <span 
                          className="font-semibold flex-shrink-0" 
                          style={{ 
                            color: '#ffffff', 
                            background: '#e74c3c', 
                            padding: '2px 4px', 
                            borderRadius: '4px', 
                            fontSize: '8px', 
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                            minWidth: 'fit-content',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }}
                        >
                          {formatPercentOff(calculatePercentOff(product))}
                        </span>
                      )}
                      {/* Stock indicator */}
                      {getActualStock(product) > 0 && getActualStock(product) <= 5 && (
                        <span 
                          className="font-medium flex-shrink-0"
                          style={{ 
                            color: '#ff9500', 
                            background: '#fff8f0', 
                            padding: '1px 3px', 
                            borderRadius: '3px',
                            fontSize: '7px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {getActualStock(product)} left
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading more products indicator */}
          {loadingMore && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              padding: '20px',
              marginTop: '20px'
            }}>
              <div className="animate-pulse flex items-center gap-2" style={{ color: '#6b7280' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #e5e7eb',
                  borderTop: '2px solid #3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <span>Loading more products...</span>
              </div>
            </div>
          )}

          {/* End of products message */}
          {!hasMore && products.length > 0 && !loading && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              padding: '40px 20px',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              <span>You've reached the end of our product catalog</span>
            </div>
          )}
        </>
      )}
      
      {/* Size Selection Popup */}
      {showSizeSelectionPopup && popupProduct && (
        <div 
          className="popup-overlay"
          style={{ 
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: '999999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={closeSizePopup}
        >
          <div 
            className="popup-content"
            style={{ 
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              zIndex: '999999'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#333' }}>
              Size Selection Required
            </h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              Please open Quick View to select your desired size and add to cart.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleOpenQuickViewFromPopup}
                className="btn btn-primary px-6 py-2"
              >
                Open Quick View
              </button>
              <button
                onClick={closeSizePopup}
                className="btn btn-secondary px-6 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* QuickView Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={closeQuickView}
      />
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ModernProductListing;