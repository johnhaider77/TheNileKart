import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/components.css';

interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  background_image?: string;
  offer_page_url: string;
  is_active: boolean;
  display_order: number;
  offer_name: string;
}

const BannerCarousel: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  const fetchBanners = async () => {
    try {
      const response = await api.get('/api/banners');
      if (response.data.success) {
        setBanners(response.data.banners);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerClick = (offerCode: string) => {
    navigate(`/products/offers/${offerCode}`);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? banners.length - 1 : prevIndex - 1
    );
  };

  if (loading) {
    return (
      <div className="banner-skeleton">
        <div className="banner-skeleton-content"></div>
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="banner-carousel mb-6">
      <div className="banner-container">
        {banners.map((banner, index) => {
          let imageUrl = null;
          
          if (banner.background_image) {
            if (banner.background_image.startsWith('http')) {
              // Full URL
              imageUrl = banner.background_image;
            } else if (banner.background_image.startsWith('/uploads')) {
              // Path already includes /uploads
              imageUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${banner.background_image}`;
            } else if (banner.background_image.startsWith('uploads')) {
              // Path without leading slash
              imageUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/${banner.background_image}`;
            } else {
              // Just filename
              imageUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/uploads/banners/${banner.background_image}`;
            }
          }

          return (
            <div
              key={banner.id}
              className={`banner-slide ${index === currentIndex ? 'active' : ''}`}
              onClick={() => handleBannerClick(banner.offer_page_url)}
              style={{
                backgroundImage: imageUrl ? `url("${imageUrl}")` : undefined
              }}
            >
              {!imageUrl && <div className="banner-gradient"></div>}
              <div className="banner-overlay"></div>
              
              <div className="banner-content">
                <div className="banner-text">
                  <h2 className="banner-title">{banner.title}</h2>
                  {banner.subtitle && (
                    <p className="banner-subtitle">{banner.subtitle}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {banners.length > 1 && (
          <>
            {/* Navigation arrows - set to display: none to hide them */}
            <button
              className="banner-nav banner-nav-prev"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              aria-label="Previous banner"
              style={{ display: 'none' }} // Hidden as requested
            >
              &#8249;
            </button>
            
            <button
              className="banner-nav banner-nav-next"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              aria-label="Next banner"
              style={{ display: 'none' }} // Hidden as requested
            >
              &#8250;
            </button>
            
            <div className="banner-indicators">
              {banners.map((_, index) => (
                <button
                  key={index}
                  className={`banner-dot ${index === currentIndex ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(index);
                  }}
                  aria-label={`Go to banner ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BannerCarousel;