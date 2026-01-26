import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Product } from '../utils/types';
import { useCart } from '../context/CartContext';
import SizeChartModal from './SizeChartModal';

interface QuickViewModalProps {
  product: Product | any;
  isOpen: boolean;
  onClose: () => void;
}

// Utility function to calculate % OFF for a specific size
const calculateSizePercentOff = (product: Product, size: string): number => {
  if (product.sizes && product.sizes.length > 0) {
    const sizeData = product.sizes.find(s => s.size === size);
    if (sizeData && sizeData.market_price && sizeData.market_price > 0 && sizeData.price !== undefined && sizeData.price > 0) {
      if (sizeData.price < sizeData.market_price) {
        return ((sizeData.market_price - sizeData.price) / sizeData.market_price) * 100;
      }
    }
  }
  
  // Fallback: check if there's a global market_price on the product level
  if (product.market_price && product.market_price > 0 && product.price < product.market_price) {
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

interface QuickViewModalProps {
  product: Product | any;
  isOpen: boolean;
  onClose: () => void;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColour, setSelectedColour] = useState<string>('');
  const [availableSizes, setAvailableSizes] = useState<any[]>([]);
  const [availableColours, setAvailableColours] = useState<any[]>([]);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalIndex, setImageModalIndex] = useState(0);
  const [isSizeChartModalOpen, setIsSizeChartModalOpen] = useState(false);
  const [parsedSizeChart, setParsedSizeChart] = useState<any | null>(null);
  const { addToCart } = useCart();

  // Reset modal state when QuickView closes
  useEffect(() => {
    if (!isOpen) {
      setIsSizeChartModalOpen(false);
      setCurrentImageIndex(0);
    }
  }, [isOpen]);

  // Parse size chart data when product changes
  useEffect(() => {
    console.log('📊 Processing product size_chart:', { 
      hasSizeChart: !!product?.size_chart, 
      type: typeof product?.size_chart,
      value: product?.size_chart 
    });
    
    if (product?.size_chart) {
      try {
        if (typeof product.size_chart === 'string') {
          const parsed = JSON.parse(product.size_chart);
          setParsedSizeChart(parsed);
          console.log('✅ Size chart parsed from string:', parsed);
        } else {
          setParsedSizeChart(product.size_chart);
          console.log('✅ Size chart is object:', product.size_chart);
        }
      } catch (err) {
        console.error('❌ Error parsing size chart:', err);
        setParsedSizeChart(null);
      }
    } else {
      console.log('📊 No size_chart in product');
      setParsedSizeChart(null);
    }
  }, [product?.size_chart]);

  // Debug state changes
  useEffect(() => {
    console.log('State changed:', { isImageModalOpen, imageModalIndex });
  }, [isImageModalOpen, imageModalIndex]);

  // Get unique sizes from product
  const getUniqueSizes = (sizesList: any[]) => {
    const uniqueSizes = Array.from(new Map(
      sizesList.map(s => [s.size, s])
    ).values());
    return uniqueSizes;
  };

  // Get colours available for a specific size
  const getColoursForSize = (size: string) => {
    if (!product.sizes || !Array.isArray(product.sizes)) return [];
    return product.sizes
      .filter((s: any) => s.size === size && s.quantity > 0)
      .map((s: any) => ({
        colour: s.colour || 'Default',
        quantity: s.quantity,
        price: s.price,
        market_price: s.market_price,
        actual_buy_price: s.actual_buy_price,
        cod_eligible: s.cod_eligible
      }))
      .filter((c: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.colour === c.colour) === i);
  };

  // Reset states when modal opens with new product
  useEffect(() => {
    if (isOpen && product) {
      setCurrentImageIndex(0);
      setQuantity(1);
      setSelectedSize('');
      setSelectedColour('');
      
      // Load available sizes from product
      if (product.sizes && Array.isArray(product.sizes)) {
        const uniqueSizes = getUniqueSizes(product.sizes);
        setAvailableSizes(uniqueSizes);
        
        // Auto-select first available size
        const firstAvailableSize = uniqueSizes.find((size: any) => 
          product.sizes.some((s: any) => s.size === size.size && s.quantity > 0)
        );
        
        if (firstAvailableSize) {
          setSelectedSize(firstAvailableSize.size);
          const coloursForSize = getColoursForSize(firstAvailableSize.size);
          setAvailableColours(coloursForSize);
          if (coloursForSize.length > 0) {
            setSelectedColour(coloursForSize[0].colour);
          }
        }
      } else {
        // Fallback to single size for backward compatibility
        setAvailableSizes([{ size: 'One Size', quantity: product.stock_quantity || 0 }]);
        setSelectedSize('One Size');
        setSelectedColour('Default');
      }
    }
  }, [isOpen, product]);

  // Handle size selection change - update available colours
  const handleSizeChange = (newSize: string) => {
    setSelectedSize(newSize);
    const coloursForSize = getColoursForSize(newSize);
    setAvailableColours(coloursForSize);
    if (coloursForSize.length > 0) {
      setSelectedColour(coloursForSize[0].colour);
    } else {
      setSelectedColour('');
    }
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle escape key for image modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isImageModalOpen) {
        setIsImageModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isImageModalOpen]);

  if (!isOpen || !product) {
    // Still render SizeChartModal even if QuickView is closed
    // This allows the size chart modal to display independently
    return (
      <>
        <SizeChartModal
          isOpen={isSizeChartModalOpen}
          onClose={() => {
            console.log('📏 Closing size chart modal');
            setIsSizeChartModalOpen(false);
          }}
          sizeChart={parsedSizeChart}
        />
      </>
    );
  }

  // Process images and videos together - videos appear as last items
  const mediaItems = (() => {
    let items: Array<{type: 'image' | 'video', url: string}> = [];
    
    // Handle database products with JSONB images field
    if (product.images && Array.isArray(product.images)) {
      const imageUrls = product.images.map((img: any) => {
        if (typeof img === 'string') {
          return { type: 'image' as const, url: img };
        }
        if (img.url) {
          // Add localhost prefix if URL doesn't start with http
          const fullUrl = img.url.startsWith('http') ? img.url : `http://localhost:5000${img.url}`;
          return { type: 'image' as const, url: fullUrl };
        }
        return { type: 'image' as const, url: img };
      });
      items = [...items, ...imageUrls];
    }
    // Handle database products with single image_url
    else if (product.image_url) {
      const imageUrl = product.image_url.startsWith('http') ? product.image_url : `http://localhost:5000${product.image_url}`;
      items.push({ type: 'image' as const, url: imageUrl });
    }
    
    // Add videos as last items
    if (product.videos && Array.isArray(product.videos) && product.videos.length > 0) {
      console.log('Processing videos:', product.videos);
      const videoUrls = product.videos
        .filter((vid: any) => {
          console.log('Filtering video:', vid);
          return vid && (typeof vid === 'string' || (vid && vid.url));
        })
        .map((vid: any) => {
          console.log('Mapping video:', vid);
          if (typeof vid === 'string') {
            const fullUrl = vid.startsWith('http') ? vid : `http://localhost:5000${vid}`;
            console.log('String video URL:', fullUrl);
            return { type: 'video' as const, url: fullUrl };
          }
          if (vid && vid.url) {
            // Add localhost prefix if URL doesn't start with http
            const fullUrl = vid.url.startsWith('http') ? vid.url : `http://localhost:5000${vid.url}`;
            console.log('Object video URL:', fullUrl);
            return { type: 'video' as const, url: fullUrl };
          }
          console.log('Fallback video:', vid);
          return { type: 'video' as const, url: vid };
        });
      items = [...items, ...videoUrls];
      console.log('Final video items:', videoUrls);
    }
    
    // Fallback image if no media
    if (items.length === 0) {
      items.push({ type: 'image' as const, url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop' });
    }
    
    return items;
  })();
  
  const currentMedia = mediaItems[currentImageIndex];
  
  // Calculate current price based on selected (size, colour) combination
  const getCurrentPrice = () => {
    // If there's only one size and it's "One Size", auto-select it
    const effectiveSelectedSize = availableSizes.length === 1 && availableSizes[0].size === 'One Size' 
      ? 'One Size' 
      : selectedSize;
      
    if (!effectiveSelectedSize) {
      return Number(product.price);
    }
    
    // If colour is selected, look up by (size, colour) combination
    if (selectedColour && product.sizes && product.sizes.length > 0) {
      const selectedSizeColourData = product.sizes.find((s: any) => 
        s.size === effectiveSelectedSize && (s.colour || 'Default') === (selectedColour || 'Default')
      );
      if (selectedSizeColourData?.price) {
        return Number(selectedSizeColourData.price);
      }
    }
    
    // Fall back to size-only lookup if no colour selected
    const selectedSizeData = availableSizes.find(size => size.size === effectiveSelectedSize);
    
    // Use size-specific price if available, otherwise fall back to base product price
    return selectedSizeData?.price ? Number(selectedSizeData.price) : Number(product.price);
  };
  
  const currentPrice = getCurrentPrice();
  
  // Calculate actual discount percentage based on selected (size, colour) combination
  const getDiscountPercentage = () => {
    const effectiveSelectedSize = availableSizes.length === 1 && availableSizes[0].size === 'One Size' 
      ? 'One Size' 
      : selectedSize;
      
    if (!effectiveSelectedSize) {
      return 0;
    }
    
    // If colour is selected, calculate discount based on (size, colour) combination
    if (selectedColour && product.sizes && product.sizes.length > 0) {
      const sizeColourData = product.sizes.find((s: any) => 
        s.size === effectiveSelectedSize && (s.colour || 'Default') === (selectedColour || 'Default')
      );
      if (sizeColourData && sizeColourData.market_price && sizeColourData.market_price > 0 && 
          sizeColourData.price !== undefined && sizeColourData.price > 0) {
        if (sizeColourData.price < sizeColourData.market_price) {
          return ((sizeColourData.market_price - sizeColourData.price) / sizeColourData.market_price) * 100;
        }
      }
    }
    
    // Fall back to size-only calculation
    return calculateSizePercentOff(product, effectiveSelectedSize);
  };
  
  const discountPercentage = getDiscountPercentage();
  
  // Get the market price for the selected (size, colour) combination, with fallback to product level
  const getMarketPrice = (): number => {
    const effectiveSelectedSize = availableSizes.length === 1 && availableSizes[0].size === 'One Size' 
      ? 'One Size' 
      : selectedSize;
    
    if (effectiveSelectedSize && product.sizes && product.sizes.length > 0) {
      // If colour is selected, look up by (size, colour) combination
      if (selectedColour) {
        const sizeColourData = product.sizes.find((s: any) => 
          s.size === effectiveSelectedSize && (s.colour || 'Default') === (selectedColour || 'Default')
        );
        if (sizeColourData && sizeColourData.market_price && sizeColourData.market_price > 0) {
          return Number(sizeColourData.market_price);
        }
      }
      
      // Fall back to size-only lookup if no colour selected
      const sizeData = product.sizes.find((s: any) => s.size === effectiveSelectedSize);
      if (sizeData && sizeData.market_price && sizeData.market_price > 0) {
        return Number(sizeData.market_price);
      }
    }
    
    // Fallback to product level market price
    return product.market_price && product.market_price > 0 ? Number(product.market_price) : currentPrice;
  };
  
  const originalPrice = getMarketPrice();

  const handleImageClick = (e: React.MouseEvent | React.TouchEvent) => {
    console.log('handleImageClick called!', currentImageIndex, mediaItems.length);
    e.preventDefault();
    e.stopPropagation();
    
    setImageModalIndex(currentImageIndex);
    setIsImageModalOpen(true);
    console.log('Image modal should open now:', currentImageIndex);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
  };

  const navigateImageModal = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setImageModalIndex((prev) => prev === 0 ? mediaItems.length - 1 : prev - 1);
    } else {
      setImageModalIndex((prev) => prev === mediaItems.length - 1 ? 0 : prev + 1);
    }
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1));
  };

  // Calculate effective selected size (auto-select "One Size" if it's the only option)
  const effectiveSelectedSize = availableSizes.length === 1 && availableSizes[0].size === 'One Size' 
    ? 'One Size' 
    : selectedSize;

  const handleAddToCart = async () => {
    try {
      if (!effectiveSelectedSize) {
        alert('Please select a size');
        return;
      }
      
      // Check if colour is selected (if colours are available)
      if (availableColours.length > 0 && !selectedColour) {
        alert('Please select a colour');
        return;
      }
      
      // Check if selected size+colour combination has enough stock
      const selectedSizeColourData = product.sizes?.find((s: any) => 
        s.size === effectiveSelectedSize && (s.colour || 'Default') === (selectedColour || 'Default')
      );
      
      if (!selectedSizeColourData || selectedSizeColourData.quantity < quantity) {
        alert(`Not enough stock for size ${effectiveSelectedSize} in ${selectedColour || 'Default'}. Available: ${selectedSizeColourData?.quantity || 0}`);
        return;
      }
      
      // Transform product to include size, colour, and image_url for cart display
      const productForCart = {
        ...product,
        image_url: currentMedia.type === 'image' ? currentMedia.url : (product.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop'),
        selectedSize: effectiveSelectedSize,
        selectedColour: selectedColour || 'Default'
      };
      await addToCart(productForCart, quantity);
      onClose(); // Close modal after adding to cart
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
    <div className="quickview-overlay" onClick={handleOverlayClick}>
      <div className="quickview-modal">
        {/* Close button */}
        <button 
          className="quickview-close" 
          onClick={onClose} 
          aria-label="Close Quick View"
          title="Close Quick View (Press Escape)"
        >
          ✕
        </button>

        <div className="quickview-content">
          {/* Image Gallery */}
          <div className="quickview-images">
            {/* Main Image/Video */}
            <div 
              className="quickview-main-image" 
              onClick={handleImageClick}
              style={{ 
                cursor: 'pointer', 
                touchAction: 'manipulation',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                position: 'relative',
                zIndex: 1
              }}
              role="button"
              tabIndex={0}
            >
              {currentMedia.type === 'video' ? (
                <video
                  src={currentMedia.url}
                  controls
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    console.error('Video load error:', e);
                  }}
                />
              ) : (
                <img 
                  src={currentMedia.url} 
                  alt={product.name}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop') {
                      target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop';
                    }
                  }}
                />
              )}
              
              {/* Media navigation */}
              {mediaItems.length > 1 && (
                <>
                  <button 
                    className="quickview-nav-btn quickview-prev" 
                    onClick={handlePrevImage}
                    aria-label="Previous media"
                  >
                    ‹
                  </button>
                  <button 
                    className="quickview-nav-btn quickview-next" 
                    onClick={handleNextImage}
                    aria-label="Next media"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Media thumbnails */}
            {mediaItems.length > 1 && (
              <div className="quickview-thumbnails">
                {mediaItems.map((media, index) => (
                  <button
                    key={index}
                    className={`quickview-thumbnail ${index === currentImageIndex ? 'active' : ''} ${media.type === 'video' ? 'video-thumbnail' : ''}`}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    {media.type === 'video' ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <video 
                          src={media.url} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          muted
                        />
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: 'white',
                          fontSize: '16px',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                        }}>▶</div>
                      </div>
                    ) : (
                      <img src={media.url} alt={`${product.name} ${index + 1}`} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="quickview-details">
            <div className="quickview-header">
              <h2 className="quickview-title">{product.name}</h2>
              <div className="quickview-category">
                {product.stock !== undefined && product.stock <= 5 && product.stock > 0 && (
                  <span className="stock-warning">Only {product.stock} left!</span>
                )}
              </div>
            </div>

            <div className="quickview-pricing">
              <div className="price-section">
                <span className="current-price">AED {currentPrice.toFixed(2)}</span>
                {formatPercentOff(discountPercentage) && (
                  <span className="discount-badge">{formatPercentOff(discountPercentage)}</span>
                )}
              </div>
              {originalPrice > currentPrice && (
                <div className="original-price">
                  <span className="crossed-price">AED {originalPrice.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Size Selection - Only show if more than one size or size is not "One Size" */}
            {availableSizes.length > 1 && (
              <div className="quickview-sizes">
                <div className="size-header">
                  <h4>Size</h4>
                  {product.size_chart && (
                    <button
                      type="button"
                      className="size-chart-icon-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsSizeChartModalOpen(true);
                      }}
                      title="View Size Chart"
                      aria-label="View size chart"
                    >
                      📏
                    </button>
                  )}
                </div>
                <div className="size-options">
                  {availableSizes.map((size: any) => {
                    const hasSizeWithStock = product.sizes.some((s: any) => s.size === size.size && s.quantity > 0);
                    return (
                      <button
                        key={size.size}
                        type="button"
                        className={`size-option ${selectedSize === size.size ? 'selected' : ''} ${!hasSizeWithStock ? 'out-of-stock' : ''}`}
                        onClick={() => hasSizeWithStock && handleSizeChange(size.size)}
                        disabled={!hasSizeWithStock}
                        title={!hasSizeWithStock ? 'Out of stock' : 'Select size'}
                      >
                        {size.size}
                        {!hasSizeWithStock && <span className="oos-label">✕</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Colour Selection - Show available colours for selected size */}
            {availableColours.length > 0 && (
              <div className="quickview-sizes">
                <h4>Colour</h4>
                <div className="size-options">
                  {availableColours.map((colour: any) => (
                    <button
                      key={colour.colour}
                      type="button"
                      className={`size-option ${selectedColour === colour.colour ? 'selected' : ''} ${colour.quantity === 0 ? 'out-of-stock' : ''}`}
                      onClick={() => colour.quantity > 0 && setSelectedColour(colour.colour)}
                      disabled={colour.quantity === 0}
                      title={colour.quantity === 0 ? 'Out of stock' : `${colour.quantity} available`}
                    >
                      {colour.colour}
                      {colour.quantity === 0 && <span className="oos-label">✕</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Chart Display - Show always if available, regardless of number of sizes */}
            {parsedSizeChart && (
              <div className="quickview-size-chart-section">
                <button
                  type="button"
                  className="quickview-size-chart-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('📏 Size chart button clicked, opening modal...');
                    setIsSizeChartModalOpen(true);
                  }}
                  title="View detailed size chart"
                  aria-label="View size chart"
                >
                  📏 View Size Chart
                </button>
              </div>
            )}

            {/* Quantity and Add to Cart - Moved above description */}
            <div className="quickview-actions">
              {/* Get stock for selected size+colour combination */}
              {(() => {
                // Find the selected size+colour combination
                const selectedSizeColourData = product.sizes?.find((s: any) => 
                  s.size === selectedSize && (s.colour || 'Default') === (selectedColour || 'Default')
                );
                const currentStock = selectedSizeColourData?.quantity || 0;
                
                if (currentStock === 0) {
                  return (
                    <div 
                      style={{
                        background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
                        color: 'white',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        textAlign: 'center',
                        marginBottom: '12px'
                      }}
                    >
                      SOLD OUT
                    </div>
                  );
                }
                
                // Only show "Please select a size" if size selection is visible (more than one size or not "One Size")
                if (!effectiveSelectedSize && !(availableSizes.length === 1 && availableSizes[0].size === 'One Size')) {
                  return (
                    <div 
                      style={{
                        background: '#fff8f0',
                        color: '#ff9500',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        textAlign: 'center',
                        marginBottom: '12px',
                        border: '1px solid #ffd700'
                      }}
                    >
                      Please select a size
                    </div>
                  );
                }
                
                if (currentStock === 0) {
                  return (
                    <div 
                      style={{
                        background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
                        color: 'white',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        textAlign: 'center',
                        marginBottom: '12px'
                      }}
                    >
                      {availableSizes.length === 1 && availableSizes[0].size === 'One Size' 
                        ? 'SOLD OUT' 
                        : `SIZE ${effectiveSelectedSize} SOLD OUT`
                      }
                    </div>
                  );
                }
                
                return (
                  <>
                    {currentStock <= 5 && (
                      <div 
                        style={{
                          background: '#fff8f0',
                          color: '#ff9500',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          textAlign: 'center',
                          marginBottom: '12px',
                          border: '1px solid #ffd700'
                        }}
                      >
                        {availableSizes.length === 1 && availableSizes[0].size === 'One Size' 
                          ? `Only ${currentStock} left!` 
                          : `Only ${currentStock} left in size ${effectiveSelectedSize}!`
                        }
                      </div>
                    )}
                    
                    <div className="quantity-section">
                      <label htmlFor="quantity">Quantity:</label>
                      <div className="quantity-controls">
                        <button 
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          className="quantity-btn"
                        >
                          -
                        </button>
                        <input
                          id="quantity"
                          type="number"
                          min="1"
                          max={currentStock}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Math.min(currentStock, parseInt(e.target.value) || 1)))}
                          className="quantity-input"
                        />
                        <button 
                          type="button"
                          onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                          disabled={quantity >= currentStock}
                          className="quantity-btn"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleAddToCart}
                      disabled={(!effectiveSelectedSize && !(availableSizes.length === 1 && availableSizes[0].size === 'One Size')) || currentStock === 0}
                      className="quickview-add-btn"
                    >
                      Add {quantity} to Cart
                    </button>
                  </>
                );
              })()} 
            </div>

            <div className="quickview-description">
              <h4>Description</h4>
              <ul className="description-list">
                {product.description
                  ?.split(/[\n.]/)  // Split by newlines or periods
                  .map((item: string) => item.trim())  // Remove whitespace
                  .filter((item: string) => item.length > 0)  // Remove empty items
                  .map((item: string, index: number) => (
                    <li key={index} className="description-item">
                      <span className="bullet-icon">🔸</span>
                      {item}
                    </li>
                  )) || (
                    <li className="description-item">
                      <span className="bullet-icon">🔸</span>
                      No description available
                    </li>
                  )
                }
              </ul>
            </div>

            {/* Product Features/Highlights */}
            <div className="quickview-features">
              <h4>Key Features</h4>
              <ul>
                <li>✓ Free shipping on orders over AED 100</li>
                <li>✓ Authentic products only</li>
                <li>✓ NO return policy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Image/Video Enlargement Modal */}
    {(() => {
      console.log('Modal render check:', {
        isImageModalOpen,
        mediaItems: mediaItems?.length,
        condition: isImageModalOpen && mediaItems && mediaItems.length > 0
      });
      
      if (isImageModalOpen && mediaItems && mediaItems.length > 0) {
        // Check if modal is being rendered
        setTimeout(() => {
          const modal = document.querySelector('.quickview-media-overlay');
          console.log('Modal in DOM:', !!modal);
          if (modal) {
            const styles = window.getComputedStyle(modal);
            console.log('Modal styles:', {
              display: styles.display,
              position: styles.position,
              zIndex: styles.zIndex,
              opacity: styles.opacity,
              visibility: styles.visibility
            });
          }
        }, 100);
      }
      
      return isImageModalOpen && mediaItems && mediaItems.length > 0;
    })() && (
      <div 
        className="quickview-media-overlay"
        onClick={(e) => {
          // Close when clicking on overlay
          if (e.target === e.currentTarget) {
            closeImageModal();
          }
        }}
      >
        <div 
          className="quickview-media-container"
          onClick={(e) => {
            // Close when clicking on container (but not on img/video)
            closeImageModal();
          }}
        >
          <button 
            className="quickview-media-close"
            onClick={closeImageModal}
            aria-label="Close enlarged view"
          >
            ✕
          </button>
          
          {mediaItems.length > 1 && (
            <>
              <button 
                className="quickview-media-nav quickview-media-prev"
                onClick={() => setImageModalIndex(imageModalIndex > 0 ? imageModalIndex - 1 : mediaItems.length - 1)}
                aria-label="Previous media"
              >
                ‹
              </button>
              <button 
                className="quickview-media-nav quickview-media-next"
                onClick={() => setImageModalIndex(imageModalIndex < mediaItems.length - 1 ? imageModalIndex + 1 : 0)}
                aria-label="Next media"
              >
                ›
              </button>
            </>
          )}
          
          <div className="quickview-media-content">
            {mediaItems[imageModalIndex]?.type === 'video' ? (
              <video
                src={mediaItems[imageModalIndex]?.url}
                controls
                autoPlay
                className="quickview-enlarged-video"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  console.error('Enlarged video load error:', e);
                }}
              />
            ) : (
              <img 
                src={mediaItems[imageModalIndex]?.url} 
                alt={`${product.name} - ${imageModalIndex + 1}`}
                className="quickview-enlarged-image"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop') {
                    target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop';
                  }
                }}
              />
            )}
          </div>
          
          {mediaItems.length > 1 && (
            <div className="quickview-media-counter">
              {imageModalIndex + 1} / {mediaItems.length}
            </div>
          )}
        </div>

      </div>
    )}

    {/* Size Chart Modal - Rendered via Portal outside QuickViewModal hierarchy */}
    {ReactDOM.createPortal(
      <SizeChartModal
        isOpen={isSizeChartModalOpen}
        onClose={() => {
          console.log('📏 Closing size chart modal');
          setIsSizeChartModalOpen(false);
        }}
        sizeChart={parsedSizeChart}
        compact={true}
      />,
      document.body
    )}
    </>
  );
};

export default QuickViewModal;