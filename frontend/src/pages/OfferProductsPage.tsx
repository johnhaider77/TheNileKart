import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Product } from '../utils/types';
import api from '../services/api';
import { useMetrics } from '../hooks/useMetrics';
import QuickViewModal from '../components/QuickViewModal';
import ImageCarousel from '../components/ImageCarousel';
import '../styles/global.css';
const truncateProductName = (name: string, maxLength: number = 18): string => {
  if (name.length <= maxLength) {
    return name;
  }
  return name.substring(0, maxLength) + '...';
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

// Utility function to calculate actual available stock for products with sizes
const getActualStock = (product: Product): number => {
  // If product has sizes, sum up quantities from all sizes
  if (product.sizes && product.sizes.length > 0) {
    return product.sizes.reduce((total, size) => total + size.quantity, 0);
  }
  // Otherwise use the stock_quantity field
  return product.stock_quantity || 0;
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

// Component for responsive product name
const ProductName: React.FC<{ name: string }> = ({ name }) => {
  const truncatedName = useResponsiveTruncation(name);
  
  return (
    <h3 className="font-semibold mb-1 product-title product-title-responsive" title={name} style={{ minHeight: 'auto', maxHeight: 'auto', height: 'auto' }}>
      {truncatedName}
    </h3>
  );
};

const OfferProductsPage: React.FC = () => {
  const { offerCode } = useParams<{ offerCode: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offerInfo, setOfferInfo] = useState<any>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [animatingProduct, setAnimatingProduct] = useState<number | null>(null);
  const [showSizeSelectionPopup, setShowSizeSelectionPopup] = useState(false);
  const [popupProduct, setPopupProduct] = useState<Product | null>(null);
  // Pagination state for infinite scroll
  const [offerPage, setOfferPage] = useState(1);
  const [offerHasMore, setOfferHasMore] = useState(true);
  const [offerLoading, setOfferLoading] = useState(true);

  // Initialize metrics tracking for offer page
  const { trackOfferPage } = useMetrics({ 
    pageType: 'offer', 
    pageIdentifier: offerCode || 'unknown'
  });

  const { addToCart } = useCart();

  // Helper function to check if product has multiple available sizes
  const hasMultipleSizes = (product: Product): boolean => {
    if (!product.sizes || !Array.isArray(product.sizes)) {
      return false;
    }
    // Count sizes with stock > 0
    const availableSizes = product.sizes.filter(size => size.quantity > 0);
    return availableSizes.length > 1;
  };
  const navigate = useNavigate();

  // Fetch offer products on component mount
  useEffect(() => {
    if (offerCode) {
      fetchOfferProducts(1);
    }
  }, [offerCode]);

  // Infinite scroll effect for offer products
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 800 && // Trigger 800px before bottom
        offerHasMore &&
        !offerLoading
      ) {
        fetchOfferProducts(offerPage + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [offerHasMore, offerLoading, offerPage]);

  const fetchOfferProducts = async (pageNum: number = 1) => {
    if (!offerCode) return;
    
    try {
      // Always set loading state for first page
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setOfferLoading(true);
      }
      setError('');

      console.log('🔍 Fetching products for offer:', { offerCode, pageNum });

      // Get offer products with pagination
      const limit = pageNum === 1 ? 10 : 4; // 10 for initial load, 4 for subsequent loads
      const response = await api.get(`/offers/${offerCode}/products?page=${pageNum}&limit=${limit}`);
      
      console.log('📥 Offer products response:', {
        success: response.data.success,
        productCount: response.data.products?.length || 0,
        pageNum,
        limit,
        products: response.data.products
      });
      
      if (response.data.success) {
        // For first page, replace products; for subsequent pages, append
        if (pageNum === 1) {
          setProducts(response.data.products);
        } else {
          setProducts(prev => [...prev, ...(response.data.products || [])]);
        }
        
        // Get offer info from first product if available
        if (response.data.products.length > 0 && pageNum === 1) {
          // You might want to add offer info to the API response
          setOfferInfo({
            name: `${offerCode?.toUpperCase()} Offer`,
            description: `Special products available under ${offerCode} offer`
          });
          console.log('✅ Found', response.data.products.length, 'products for offer', offerCode);
        } else if (pageNum === 1) {
          setOfferInfo({
            name: `${offerCode?.toUpperCase()} Offer`,
            description: 'No products currently available for this offer'
          });
          console.warn('⚠️ No products found for offer:', offerCode);
        }

        // Check if there are more products to load
        const totalProducts = response.data.pagination?.totalProducts || 0;
        const hasMore = response.data.pagination?.hasNextPage || false;
        console.log('Total offer products:', totalProducts, 'Has more:', hasMore);
        setOfferHasMore(hasMore);
        setOfferPage(pageNum);
      } else {
        setError('Failed to load offer products');
        console.error('❌ API returned success: false');
      }
    } catch (err: any) {
      console.error('Error fetching offer products:', err);
      if (err.response?.status === 404) {
        setError('Offer not found');
      } else {
        setError('Failed to load offer products');
      }
    } finally {
      setLoading(false);
      setOfferLoading(false);
    }
  };

  const handleAddToCart = async (product: Product) => {
    try {
      // Check if product has multiple available sizes
      if (hasMultipleSizes(product)) {
        setPopupProduct(product);
        setShowSizeSelectionPopup(true);
        return;
      }

      setAnimatingProduct(product.id);
      
      // Find the product card element for animation
      const productElement = document.querySelector(`[data-product-id="${product.id}"]`) as HTMLElement;
      if (productElement) {
        const imageUrl = getProductImageUrls(product)[0];
        flyToCart(productElement, imageUrl);
      }

      await addToCart(product, 1);

      setTimeout(() => setAnimatingProduct(null), 1000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setAnimatingProduct(null);
    }
  };

  const flyToCart = (productElement: HTMLElement, productImage: string) => {
    // Same animation logic as in ModernProductListing
    let cartIcon: Element | null = null;
    
    const mobileCartBtn = document.querySelector('.mobile-cart-btn') as HTMLElement;
    if (mobileCartBtn && mobileCartBtn.offsetParent !== null) {
      cartIcon = mobileCartBtn;
    }
    
    if (!cartIcon) {
      const desktopCartBtn = document.querySelector('.cart-link') as HTMLElement;
      if (desktopCartBtn && desktopCartBtn.offsetParent !== null) {
        cartIcon = desktopCartBtn;
      }
    }
    
    if (!cartIcon) {
      cartIcon = document.querySelector('[title*="Cart"]') ||
                document.querySelector('button[title="Add to Cart"]') ||
                document.querySelector('.navbar .btn');
    }
    
    if (!cartIcon) return;

    const productRect = productElement.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();
    
    const flyingElement = document.createElement('div');
    flyingElement.style.cssText = `
      position: fixed;
      top: ${productRect.top + productRect.height / 2}px;
      left: ${productRect.left + productRect.width / 2}px;
      width: 40px;
      height: 40px;
      background-image: url('${productImage}');
      background-size: cover;
      background-position: center;
      border-radius: 50%;
      z-index: 9999;
      pointer-events: none;
      transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      border: 2px solid white;
    `;
    
    document.body.appendChild(flyingElement);
    
    requestAnimationFrame(() => {
      flyingElement.style.transform = `translate(${cartRect.left + cartRect.width / 2 - productRect.left - productRect.width / 2}px, ${cartRect.top + cartRect.height / 2 - productRect.top - productRect.height / 2}px) scale(0.3)`;
      flyingElement.style.opacity = '0.8';
    });
    
    setTimeout(() => {
      if (flyingElement.parentNode) {
        flyingElement.parentNode.removeChild(flyingElement);
      }
    }, 800);
  };

  const getProductImageUrls = (product: Product): string[] => {
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const imageUrls = product.images.map((img: any) => {
        if (typeof img === 'string') {
          return img.startsWith('http') ? img : `${baseUrl}${img}`;
        } else if (img && img.url) {
          const url = img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`;
          return url;
        }
        return img;
      }).filter(Boolean);
      
      return imageUrls.length > 0 ? imageUrls : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop'];
    } else if (product.image_url) {
      const imageUrl = product.image_url.startsWith('http') 
        ? product.image_url 
        : `${baseUrl}${product.image_url}`;
      return [imageUrl];
    } else {
      return ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop'];
    }
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return (
      <span className="flex items-center gap-1" style={{ color: '#db2777' }}>
        {numPrice.toFixed(2)}
      </span>
    );
  };

  const truncateProductName = (name: string, maxLength: number = 24): string => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  const openQuickView = (product: Product) => {
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
  if (loading) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p>Loading offer products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2>Offer Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/products')}
            className="btn btn-primary"
          >
            Browse All Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 animate-fadeIn">
      {/* Breadcrumb */}
      <nav className="breadcrumb mb-6">
        <ol className="breadcrumb-list">
          <li>
            <button onClick={() => navigate('/products')} className="breadcrumb-link">
              All Products
            </button>
          </li>
          <li>
            <span className="breadcrumb-separator">›</span>
          </li>
          <li className="breadcrumb-current">
            {offerCode?.toUpperCase()} Offer
          </li>
        </ol>
      </nav>

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="products-grid">
          {products.map((product) => (
            <div
              key={product.id}
              data-product-id={product.id}
              className="card card-product"
              onClick={() => openQuickView(product)}
              style={{ 
                position: 'relative',
                opacity: (product.stock_quantity || 0) === 0 ? '0.6' : '1',
                filter: (product.stock_quantity || 0) === 0 ? 'grayscale(50%)' : 'none',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
            >
              <div className="product-image-container">
                <ImageCarousel
                  images={getProductImageUrls(product)}
                  productName={product.name}
                />
              </div>

              {/* Sold Out Watermark */}
              {(product.stock_quantity || 0) === 0 && (
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
      ) : (
        <div className="empty-state text-center py-12">
          <div className="empty-state-icon">📦</div>
          <h3>No Products Available</h3>
          <p className="text-gray-600 mb-6">
            There are currently no products available for this offer.
          </p>
          <button
            onClick={() => navigate('/products')}
            className="btn btn-primary"
          >
            Browse All Products
          </button>
        </div>
      )}

      {/* Size Selection Popup */}
      {showSizeSelectionPopup && popupProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Size Selection Required
            </h3>
            <p className="text-gray-600 mb-6">
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

      {/* Quick View Modal */}
      {isQuickViewOpen && quickViewProduct && (
        <QuickViewModal
          isOpen={isQuickViewOpen}
          product={quickViewProduct}
          onClose={closeQuickView}
        />
      )}
    </div>
  );
};

export default OfferProductsPage;