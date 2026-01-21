import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { productsAPI } from '../services/api';
import api from '../services/api';
import BannerCarousel from '../components/BannerCarousel';
import QuickViewModal from '../components/QuickViewModal';
import ImageCarousel from '../components/ImageCarousel';
import { Product } from '../utils/types';
import { CATEGORIES } from '../utils/categories';
import { useMetrics } from '../hooks/useMetrics';
import '../styles/HomePage.css';

interface Banner {
  id: number;
  title: string;
  image_url: string;
  link_url?: string;
  is_active: boolean;
}

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
    return 0;
  }
  
  const productPrice = product.price;
  if (productPrice >= productMarketPrice) {
    return 0;
  }
  
  return ((productMarketPrice - productPrice) / productMarketPrice) * 100;
};

// Format percentage off display
const formatPercentOff = (percentOff: number): string | null => {
  if (percentOff <= 0 || isNaN(percentOff)) {
    return null;
  }
  return `${Math.round(percentOff)}% OFF`;
};

// Debug function to help with market price issues
const debugProductDiscount = (product: Product) => {
  if (process.env.NODE_ENV === 'development') {
    const percentOff = calculatePercentOff(product);
    console.log(`Product: ${product.name}`, {
      price: product.price,
      market_price: product.market_price,
      sizes: product.sizes,
      calculated_percent_off: percentOff,
      formatted: formatPercentOff(percentOff)
    });
  }
};

// Get display price for a product
const getPriceDisplay = (product: Product): string => {
  if (product.sizes && product.sizes.length > 0) {
    // Get available sizes (with stock)
    const availableSizes = product.sizes.filter(size => 
      size.price !== undefined && size.quantity > 0
    );
    
    if (availableSizes.length > 0) {
      const prices = availableSizes.map(size => Number(size.price));
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      if (minPrice === maxPrice) {
        return `AED ${minPrice.toFixed(2)}`;
      } else {
        return `AED ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`;
      }
    } else {
      // No sizes with stock, show "Sold Out"
      return "Sold Out";
    }
  }
  
  // For products without sizes
  return `AED ${product.price.toFixed(2)}`;
};

// Truncate product name for display
const truncateProductName = (name: string, maxLength: number = 18): string => {
  if (name.length <= maxLength) {
    return name;
  }
  return name.substring(0, maxLength) + '...';
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

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
  // Initialize metrics tracking for HomePage
  const { trackHomePage } = useMetrics({ pageType: 'homepage' });

  // State management
  const [banners, setBanners] = useState<Banner[]>([]);
  const [preferredProducts, setPreferredProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatingProduct, setAnimatingProduct] = useState<number | null>(null);
  const [shouldMarqueePreferred, setShouldMarqueePreferred] = useState(false);
  const [shouldMarqueeTrending, setShouldMarqueeTrending] = useState(false);
  const [isUserScrollingPreferred, setIsUserScrollingPreferred] = useState(false);
  const [isUserScrollingTrending, setIsUserScrollingTrending] = useState(false);

  // All products pagination state
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allProductsPage, setAllProductsPage] = useState(1);
  const [allProductsHasMore, setAllProductsHasMore] = useState(true);
  const [allProductsLoading, setAllProductsLoading] = useState(true);

  // Search functionality state
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  // Refs for search functionality
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchHomePageData();
  }, [user]);

  // Handle clicks outside search to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchActive(false);
        setSearchQuery('');
        setSearchSuggestions([]);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSearchActive) {
        setIsSearchActive(false);
        setSearchQuery('');
        setSearchSuggestions([]);
      }
    };

    if (isSearchActive) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSearchActive]);

  // Initialize all products on component mount
  useEffect(() => {
    fetchAllProducts(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll effect for all products
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 800 && // Trigger 800px before bottom
        allProductsHasMore &&
        !allProductsLoading
      ) {
        fetchAllProducts(allProductsPage + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [allProductsHasMore, allProductsLoading, allProductsPage]);

  // Search functionality
  const handleSearchFocus = () => {
    setIsSearchActive(true);
  };

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    
    if (value.length >= 3) {
      setIsLoadingSuggestions(true);
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/products?search=${encodeURIComponent(value)}&limit=5`);
        if (response.ok) {
          const data = await response.json();
          const suggestions = data.products ? data.products.map((product: any) => product.name).slice(0, 5) : [];
          setSearchSuggestions(suggestions);
        } else {
          // Fallback suggestions
          const mockSuggestions = [
            'Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 'Beauty'
          ].filter(item => item.toLowerCase().includes(value.toLowerCase()));
          setSearchSuggestions(mockSuggestions);
        }
      } catch (error) {
        console.error('Search suggestions error:', error);
        setSearchSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    } else {
      setSearchSuggestions([]);
    }
  };

  const handleSearchSubmit = (query: string = searchQuery) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsSearchActive(false);
      setSearchQuery('');
      setSearchSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSearchSubmit(suggestion);
  };

  // Check if marquee should be enabled based on product count and screen size
  useEffect(() => {
    const checkMarqueeNeed = () => {
      const isMobile = window.innerWidth <= 768;
      const minProducts = isMobile ? 2 : 4;
      
      setShouldMarqueePreferred(preferredProducts.length > minProducts);
      setShouldMarqueeTrending(trendingProducts.length > minProducts);
    };

    checkMarqueeNeed();
    
    // Re-check on window resize
    window.addEventListener('resize', checkMarqueeNeed);
    return () => window.removeEventListener('resize', checkMarqueeNeed);
  }, [preferredProducts.length, trendingProducts.length]);

  // Handle user scroll interactions
  const handlePreferredScroll = () => {
    setIsUserScrollingPreferred(true);
    // Resume marquee after 3 seconds of no scrolling
    setTimeout(() => setIsUserScrollingPreferred(false), 3000);
  };

  const handleTrendingScroll = () => {
    setIsUserScrollingTrending(true);
    // Resume marquee after 3 seconds of no scrolling
    setTimeout(() => setIsUserScrollingTrending(false), 3000);
  };

  const fetchHomePageData = async () => {
    try {
      setLoading(true);
      
      // Fetch banners
      const bannersResponse = await api.get('/banners');
      setBanners(bannersResponse.data.banners || []);

      // Fetch preferred products for logged-in users
      if (user) {
        try {
          const preferredResponse = await api.get('/products/preferred');
          setPreferredProducts(preferredResponse.data.products?.slice(0, 10) || []);
        } catch (error) {
          console.warn('Could not fetch preferred products:', error);
          // Fallback to recent products
          const fallbackResponse = await productsAPI.getProducts({ limit: 10 });
          setPreferredProducts(fallbackResponse.data.products || []);
        }
      } else {
        // For guest users, show recent products
        const guestResponse = await productsAPI.getProducts({ limit: 10 });
        setPreferredProducts(guestResponse.data.products || []);
      }

      // Fetch trending products
      try {
        const trendingResponse = await api.get('/products/trending');
        setTrendingProducts(trendingResponse.data.products || []);
      } catch (error) {
        console.warn('Could not fetch trending products:', error);
        // Fallback to popular products
        const fallbackResponse = await productsAPI.getProducts({ limit: 10 });
        setTrendingProducts(fallbackResponse.data.products || []);
      }

    } catch (error) {
      console.error('Error fetching home page data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProducts = async (pageNum: number = 1) => {
    try {
      // Always set loading state for first page
      if (pageNum === 1) {
        setAllProductsLoading(true);
      } else {
        setAllProductsLoading(true); // Also set during pagination
      }

      const limit = pageNum === 1 ? 10 : 4; // 10 for initial load, 4 for subsequent loads
      const params: any = { limit, page: pageNum };

      console.log('Fetching all products with params:', params);
      const response = await productsAPI.getProducts(params);
      
      console.log('Products API response:', response);
      
      if (pageNum === 1) {
        setAllProducts(response.data.products || []);
      } else {
        setAllProducts(prev => [...prev, ...(response.data.products || [])]);
      }

      // Check if there are more products to load
      const totalProducts = response.data.pagination?.totalProducts || 0;
      const hasMore = response.data.pagination?.hasNextPage || false;
      console.log('Total products:', totalProducts, 'Has more:', hasMore);
      setAllProductsHasMore(hasMore);
      setAllProductsPage(pageNum);
    } catch (error) {
      console.error('Error fetching all products:', error);
      // Ensure we show an empty state rather than the loading state
      if (pageNum === 1) {
        setAllProducts([]);
      }
    } finally {
      setAllProductsLoading(false);
    }
  };

  const handleAddToCart = async (product: Product, e?: React.MouseEvent) => {
    // Check if product has sizes and requires selection
    if (product.sizes && product.sizes.length > 0) {
      // Open quick view for size selection
      setQuickViewProduct(product);
      return;
    }
    
    // Check if product is in stock
    if (getActualStock(product) === 0) {
      return; // Don't add sold out products
    }
    
    // Add animation effect
    setAnimatingProduct(product.id);
    
    try {
      await addToCart(product, 1);
    } finally {
      // Remove animation after a delay
      setTimeout(() => setAnimatingProduct(null), 600);
    }
  };
  
  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
  };

  const ProductName: React.FC<{ name: string }> = ({ name }) => {
    return (
      <h4 
        className="font-medium mb-1" 
        style={{ 
          fontSize: '12px', 
          lineHeight: '1.3', 
          color: 'var(--text-primary)', 
          minHeight: '30px', 
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        title={name}
      >
        {truncateProductName(name, 35)}
      </h4>
    );
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="container">
          <div className="loading-spinner mx-auto"></div>
          <p className="text-center">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ background: 'var(--background-primary)', minHeight: '100vh', paddingTop: 0 }}>
      {/* Hero Section with Banners */}
      <div className="hero-section">
        <div className="container">
          {/* Banner Carousel */}
          {banners.length > 0 && (
            <div className="banner-section">
              <BannerCarousel />
            </div>
          )}
        </div>
      </div>

      <div className="container">
        {/* Search Section */}
        <section className="search-section" style={{ padding: '2rem 0', maxWidth: '800px', margin: '0 auto' }}>
          <style>
            {`
              @media (max-width: 768px) {
                .search-section {
                  padding: 0.5rem 0 !important;
                }
              }
            `}
          </style>
          <div 
            ref={searchContainerRef}
            className="search-container"
            style={{ position: 'relative', width: '100%' }}
          >
            <div 
              className="search-input-wrapper"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: 'white',
                borderRadius: '50px',
                padding: '4px',
                boxShadow: isSearchActive ? '0 8px 30px rgba(0, 0, 0, 0.15)' : '0 4px 20px rgba(0, 0, 0, 0.1)',
                border: isSearchActive ? '2px solid #ec4899' : '2px solid #e5e7eb',
                transition: 'all 0.3s ease'
              }}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ marginLeft: '0.75rem', color: '#9ca3af', flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search for products, categories, brands..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={handleSearchFocus}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit();
                  }
                }}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '0.6rem',
                  fontSize: '1rem',
                  background: 'transparent',
                  color: '#333'
                }}
              />
              
              {searchQuery && (
                <button
                  onClick={() => handleSearchSubmit()}
                  style={{
                    background: 'linear-gradient(135deg, #ec4899, #be185d)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '40px',
                    padding: '8px 18px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginRight: '4px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  Search
                </button>
              )}
            </div>

            {/* Search Suggestions Dropdown */}
            {isSearchActive && (searchQuery.length >= 3 || searchSuggestions.length > 0) && (
              <div
                className="search-suggestions"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  right: '0',
                  background: 'white',
                  borderRadius: '16px',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
                  border: '1px solid #e5e7eb',
                  marginTop: '8px',
                  zIndex: 1000,
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}
              >
                {isLoadingSuggestions && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      border: '2px solid #f3f4f6',
                      borderTop: '2px solid #ec4899',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 0.5rem'
                    }}></div>
                    Loading suggestions...
                  </div>
                )}
                
                {!isLoadingSuggestions && searchSuggestions.length > 0 && (
                  <div style={{ padding: '0.5rem 0' }}>
                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#666', borderBottom: '1px solid #f3f4f6' }}>
                      Suggestions
                    </div>
                    {searchSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        style={{
                          padding: '0.75rem 1rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#9ca3af' }}>
                          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
                
                {!isLoadingSuggestions && searchQuery.length > 0 && searchQuery.length < 3 && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                    Enter at least 3 characters to see suggestions
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* You May Prefer Section */}
        <section className="products-section">
          <h2 className="section-title">
            {user ? 'You may prefer' : 'Recommended for you'}
          </h2>
          <div className="products-scroll-container">
            <div 
              className={`products-scroll ${shouldMarqueePreferred ? 'marquee-preferred' : ''} ${isUserScrollingPreferred ? 'user-scrolling' : ''}`}
              onScroll={handlePreferredScroll}
              onMouseEnter={handlePreferredScroll}
              onTouchStart={handlePreferredScroll}
            >
              <div className="products-scroll-inner">
              {/* Only duplicate products if marquee is active, otherwise show original list */}
              {(shouldMarqueePreferred ? [...preferredProducts, ...preferredProducts] : preferredProducts).map((product, index) => (
                <div
                  key={`${product.id}-${index}`}
                  className="card card-product"
                  onClick={() => handleQuickView(product)}
                  style={{ 
                    position: 'relative',
                    opacity: getActualStock(product) === 0 ? '0.6' : '1',
                    filter: getActualStock(product) === 0 ? 'grayscale(50%)' : 'none',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    flex: '0 0 220px'
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
                        return [imageUrl];
                      }
                      // Fallback image
                      return ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop'];
                    })()} 
                    productName={product.name} 
                  />
                  
                  {/* Sold Out Watermark */}
                  {getActualStock(product) === 0 && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center" 
                      style={{
                        zIndex: 10,
                        borderRadius: '12px',
                        pointerEvents: 'none'
                      }}
                    >
                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.7), rgba(238, 90, 82, 0.7))',
                          color: 'white',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '2px',
                          border: '2px solid rgba(255, 255, 255, 0.8)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          textAlign: 'center',
                          transform: 'rotate(-15deg)',
                          backdropFilter: 'blur(2px)'
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
            </div>
          </div>
        </section>

        {/* Trending Products Section */}
        <section className="products-section">
          <h2 className="section-title">Trending</h2>
          <div className="products-scroll-container">
            <div 
              className={`products-scroll ${shouldMarqueeTrending ? 'marquee-trending' : ''} ${isUserScrollingTrending ? 'user-scrolling' : ''}`}
              onScroll={handleTrendingScroll}
              onMouseEnter={handleTrendingScroll}
              onTouchStart={handleTrendingScroll}
            >
              <div className="products-scroll-inner">
              {/* Only duplicate products if marquee is active, otherwise show original list */}
              {(shouldMarqueeTrending ? [...trendingProducts, ...trendingProducts] : trendingProducts).map((product, index) => (
                <div
                  key={`${product.id}-${index}`}
                  className="card card-product"
                  onClick={() => handleQuickView(product)}
                  style={{ 
                    position: 'relative',
                    opacity: getActualStock(product) === 0 ? '0.6' : '1',
                    filter: getActualStock(product) === 0 ? 'grayscale(50%)' : 'none',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    flex: '0 0 220px'
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
                        return [imageUrl];
                      }
                      // Fallback image
                      return ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop'];
                    })()} 
                    productName={product.name} 
                  />
                  
                  {/* Trending Badge */}
                  <div className="trending-badge">🔥 Trending</div>
                  
                  {/* Sold Out Watermark */}
                  {getActualStock(product) === 0 && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center" 
                      style={{
                        zIndex: 10,
                        borderRadius: '12px',
                        pointerEvents: 'none'
                      }}
                    >
                      <div
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.7), rgba(238, 90, 82, 0.7))',
                          color: 'white',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '2px',
                          border: '2px solid rgba(255, 255, 255, 0.8)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          textAlign: 'center',
                          transform: 'rotate(-15deg)',
                          backdropFilter: 'blur(2px)'
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
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="categories-section">
          <h2 className="section-title">Shop by Category</h2>
          <div className="categories-grid">
            {CATEGORIES.map((category) => (
              <Link
                key={category.name}
                to={category.path}
                className="category-tile"
              >
                <div className="category-icon">{category.icon}</div>
                <h4 className="category-name">{category.name}</h4>
              </Link>
            ))}
          </div>
        </section>

        {/* All Products Section with Infinite Scroll */}
        <section className="products-section">
          <h2 className="section-title">Explore All Products</h2>
          {allProducts.length > 0 ? (
            <>
              <div className="products-grid">
                {allProducts.map((product) => (
                  <div
                    key={product.id}
                    className="card card-product"
                    onClick={() => handleQuickView(product)}
                    style={{ 
                      position: 'relative',
                      opacity: getActualStock(product) === 0 ? '0.6' : '1',
                      filter: getActualStock(product) === 0 ? 'grayscale(50%)' : 'none',
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
                          return [imageUrl];
                        }
                        // Fallback image
                        return ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop'];
                      })()}
                      productName={product.name}
                    />
                    
                    {/* Sold Out Watermark */}
                    {getActualStock(product) === 0 && (
                      <div 
                        className="absolute inset-0 flex items-center justify-center" 
                        style={{
                          zIndex: 10,
                          borderRadius: '12px',
                          pointerEvents: 'none'
                        }}
                      >
                        <div
                          style={{
                            background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.7), rgba(238, 90, 82, 0.7))',
                            color: 'white',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            border: '2px solid rgba(255, 255, 255, 0.8)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                            textAlign: 'center',
                            transform: 'rotate(-15deg)',
                            backdropFilter: 'blur(2px)'
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

              {/* Loading more products indicator */}
              {allProductsLoading && (
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
              {!allProductsHasMore && allProducts.length > 0 && !allProductsLoading && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  padding: '20px',
                  marginTop: '20px',
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  🎉 You've reached the end of all products
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              {allProductsLoading ? (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '3px solid #e5e7eb',
                      borderTop: '3px solid #3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto'
                    }}></div>
                  </div>
                  <p style={{ color: '#6b7280' }}>Loading all products...</p>
                </div>
              ) : (
                <p style={{ color: '#6b7280' }}>No products available at the moment</p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          isOpen={true}
          onClose={() => setQuickViewProduct(null)}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;