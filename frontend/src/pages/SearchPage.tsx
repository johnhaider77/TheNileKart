import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QuickViewModal from '../components/QuickViewModal';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  market_price: number;
  stock_quantity: number;
  category: string;
  images: string[];
  sizes: string[];
  other_details?: string;
}

const SearchPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Get search query from URL parameters
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query.trim()) {
        navigate('/products');
        return;
      }

      setLoading(true);
      setError('');
      
      try {
        const page = 1; // For now, just use page 1
        const response = await fetch(`${process.env.REACT_APP_API_URL}/products?search=${encodeURIComponent(query)}&limit=20&page=${page}`);
        
        if (!response.ok) {
          throw new Error('Search failed');
        }
        
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to fetch search results');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, navigate]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCloseQuickView = () => {
    setSelectedProduct(null);
  };

  const calculateDiscount = (price: number, marketPrice: number) => {
    if (marketPrice > price) {
      return Math.round(((marketPrice - price) / marketPrice) * 100);
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="container py-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-3 w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 animate-fadeIn">
      {/* Search Results Header */}
      <div className="mb-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Search Results
          </h1>
          <p className="text-base text-gray-500 font-medium">
            {products.length > 0 
              ? `✨ Found ${products.length} amazing result${products.length === 1 ? '' : 's'} for "${query}"`
              : `🤔 Nothing found for "${query}"`
            }
          </p>
          {products.length > 0 && (
            <button
              onClick={() => navigate('/products')}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors hover:underline"
            >
              🌟 Discover More Products →
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-center mb-6 shadow-sm">
          <span className="font-medium">⚠️ Oops! Something went wrong while searching</span>
        </div>
      )}

      {/* Search Results Grid */}
      {products.length > 0 ? (
        <div className="products-grid">
          {products.map((product) => {
            const discount = calculateDiscount(parseFloat(product.price as any), parseFloat(product.market_price as any));
            const isOutOfStock = product.stock_quantity === 0;
            
            return (
              <div
                key={product.id}
                data-product-id={product.id}
                className="card card-product"
                onClick={() => handleProductClick(product)}
                style={{
                  position: 'relative',
                  opacity: isOutOfStock ? 0.6 : 1,
                  filter: isOutOfStock ? 'grayscale(50%)' : 'none',
                  transition: '0.3s',
                  cursor: 'pointer'
                }}
              >
                {/* Product Image */}
                <div className="product-image-container">
                  <div className="product-image-container h-48">
                    <div className="image-carousel">
                      {product.images && product.images.length > 0 ? (
                        <>
                          {product.images.map((image, index) => {
                            // Handle image URL extraction
                            let imageUrl = '';
                            if (typeof image === 'string') {
                              imageUrl = image;
                            } else if (image && typeof image === 'object' && (image as any).url) {
                              // Add localhost prefix if URL doesn't start with http
                              const url = (image as any).url;
                              imageUrl = url.startsWith('http') ? url : `http://localhost:5000${url}`;
                            }
                            
                            return (
                              <img
                                key={index}
                                src={imageUrl}
                                alt={`${product.name} - View ${index + 1}`}
                                className={`product-image carousel-image ${index === 0 ? 'active' : ''}`}
                                loading="lazy"
                                decoding="async"
                              />
                            );
                          })}
                          {product.images.length > 1 && (
                            <div className="carousel-indicators">
                              {product.images.map((_, index) => (
                                <button
                                  key={index}
                                  className={`indicator ${index === 0 ? 'active' : ''}`}
                                  aria-label={`Go to image ${index + 1}`}
                                />
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="product-image-placeholder">
                          <span>No Image</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Out of Stock Overlay */}
                {isOutOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10, borderRadius: '12px', pointerEvents: 'none' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.7), rgba(238, 90, 82, 0.7))',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      border: '2px solid rgba(255, 255, 255, 0.8)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                      textAlign: 'center',
                      transform: 'rotate(-15deg)',
                      backdropFilter: 'blur(2px)'
                    }}>
                      SOLD OUT
                    </div>
                  </div>
                )}

                {/* Product Details */}
                <div className="card-body" style={{ padding: '6px 4px' }}>
                  <h3 
                    className="font-semibold mb-1 product-title product-title-responsive" 
                    title={product.name}
                    style={{ minHeight: 'auto', height: 'auto' }}
                  >
                    {product.name.length > 20 
                      ? `${product.name.substring(0, 20)}...` 
                      : product.name
                    }
                  </h3>

                  <div className="flex items-center gap-1 mb-2" style={{ flexWrap: 'nowrap', overflow: 'hidden' }}>
                    {/* Price */}
                    <span className="font-bold flex-shrink-0" style={{ fontSize: '11px', minWidth: 'auto' }}>
                      <span className="flex items-center gap-1" style={{ color: '#db2777' }}>
                        {parseFloat(product.price as any).toFixed(2)}
                      </span>
                    </span>

                    {/* Discount Badge */}
                    {discount > 0 && (
                      <span 
                        className="font-semibold flex-shrink-0" 
                        style={{
                          color: 'white',
                          background: '#e74c3c',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          fontSize: '8px',
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                          minWidth: 'fit-content',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        {discount}% OFF
                      </span>
                    )}

                    {/* Stock Badge */}
                    {!isOutOfStock && product.stock_quantity <= 5 && (
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
                        {product.stock_quantity} left
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="mb-6">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent mb-3">
                  🔍 No Matches Found
                </h2>
                <p className="text-xl text-gray-600 font-light leading-relaxed">
                  Let's try a different search term
                </p>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={() => navigate('/products')}
                  className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white px-10 py-4 rounded-full text-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300 transform shadow-lg backdrop-blur-sm"
                >
                  🛍️ Explore Categories
                </button>
                
                <p className="text-sm text-gray-400 font-medium">
                  or try searching for something else
                </p>
              </div>
            </div>
          </div>
        )
      )}

      {/* QuickView Modal */}
      {selectedProduct && (
        <QuickViewModal
          isOpen={true}
          product={selectedProduct}
          onClose={handleCloseQuickView}
        />
      )}
    </div>
  );
};

export default SearchPage;