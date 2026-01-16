import React, { useState, useEffect } from 'react';

interface ImageCarouselProps {
  images: string[];
  productName: string;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, productName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000); // Auto-swipe every 3 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (!images || images.length === 0) {
    return (
      <div className="product-image-container h-48">
        <div className="product-image-placeholder">
          <span>🖼️</span>
        </div>
      </div>
    );
  }

  return (
    <div className="product-image-container h-48">
      <div className="image-carousel">
        {images.map((image, index) => (
          <img
            key={index}
            alt={`${productName} - View ${index + 1}`}
            className={`product-image carousel-image ${
              index === currentIndex ? 'active' : ''
            }`}
            src={image}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              console.error('Image failed to load:', target.src);
              console.error('Error event:', e);
              // Only use fallback after logging the error
              if (target.src !== 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop') {
                console.log('Setting fallback image');
                target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop';
              }
            }}
            onLoad={(e) => {
              const target = e.target as HTMLImageElement;
            }}
          />
        ))}
        
        {/* Image indicators */}
        {images.length > 1 && (
          <div className="carousel-indicators">
            {images.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageCarousel;