import React, { useState, useEffect } from 'react';
import { sellerAPI } from '../services/api';
import '../styles/components.css';

interface Offer {
  offer_code: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  background_image?: string;
  offer_page_url: string;
  is_active: boolean;
  display_order: number;
  offer_name: string;
  created_at: string;
}

interface BannerFormData {
  title: string;
  subtitle: string;
  offer_page_url: string;
  display_order: number;
  background_image?: File;
}

interface OfferFormData {
  offer_code: string;
  name: string;
  description: string;
}

const BannerManagement: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  
  const [bannerForm, setBannerForm] = useState<BannerFormData>({
    title: '',
    subtitle: '',
    offer_page_url: '',
    display_order: 0,
  });
  
  const [offerForm, setOfferForm] = useState<OfferFormData>({
    offer_code: '',
    name: '',
    description: '',
  });

  const [previewImage, setPreviewImage] = useState<string>('');
  const [bannerError, setBannerError] = useState<string>('');
  const [offerError, setOfferError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bannersRes, offersRes] = await Promise.all([
        sellerAPI.getSellerBanners(),
        sellerAPI.getSellerOffers(),
      ]);
      
      if (bannersRes.data.success) {
        setBanners(bannersRes.data.banners);
      }
      
      if (offersRes.data.success) {
        setOffers(offersRes.data.offers);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError('');
    setSuccessMessage('');
    
    try {
      // Validate form
      if (!bannerForm.title.trim()) {
        setBannerError('Banner title is required');
        return;
      }
      
      if (!bannerForm.offer_page_url) {
        setBannerError('Please select an offer');
        return;
      }
      
      const formData = new FormData();
      formData.append('title', bannerForm.title);
      formData.append('subtitle', bannerForm.subtitle);
      formData.append('offer_page_url', bannerForm.offer_page_url);
      formData.append('display_order', bannerForm.display_order.toString());
      
      if (bannerForm.background_image) {
        formData.append('background_image', bannerForm.background_image);
      }
      
      if (editingBanner) {
        formData.append('is_active', 'true');
        if (editingBanner.background_image) {
          formData.append('existing_background_image', editingBanner.background_image);
        }
        
        await sellerAPI.updateBanner(editingBanner.id.toString(), formData);
        setSuccessMessage('Banner updated successfully!');
      } else {
        const response = await sellerAPI.createBanner(formData);
        console.log('Banner creation response:', response);
        setSuccessMessage('Banner created successfully!');
      }
      
      setTimeout(() => {
        setIsModalOpen(false);
        resetBannerForm();
        setSuccessMessage('');
        fetchData();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving banner:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save banner';
      setBannerError(errorMessage);
    }
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfferError('');
    setSuccessMessage('');
    
    try {
      // Validate form
      if (!offerForm.offer_code.trim()) {
        setOfferError('Offer code is required');
        return;
      }
      
      if (!offerForm.name.trim()) {
        setOfferError('Offer name is required');
        return;
      }
      
      if (editingOffer) {
        await sellerAPI.updateOffer(editingOffer.offer_code, {
          ...offerForm,
          is_active: true,
        });
        setSuccessMessage('Offer updated successfully!');
      } else {
        await sellerAPI.createOffer(offerForm);
        setSuccessMessage('Offer created successfully!');
      }
      
      setTimeout(() => {
        setIsOfferModalOpen(false);
        resetOfferForm();
        setSuccessMessage('');
        fetchData();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving offer:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save offer';
      setOfferError(errorMessage);
    }
  };

  const handleDeleteBanner = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      try {
        await sellerAPI.deleteBanner(id.toString());
        fetchData();
      } catch (error) {
        console.error('Error deleting banner:', error);
      }
    }
  };

  const handleDeleteOffer = async (offerCode: string) => {
    if (window.confirm('Are you sure you want to delete this offer? This will also delete associated banners.')) {
      try {
        await sellerAPI.deleteOffer(offerCode);
        fetchData();
      } catch (error) {
        console.error('Error deleting offer:', error);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerForm({ ...bannerForm, background_image: file });
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetBannerForm = () => {
    setBannerForm({
      title: '',
      subtitle: '',
      offer_page_url: '',
      display_order: 0,
    });
    setEditingBanner(null);
    setPreviewImage('');
  };

  const resetOfferForm = () => {
    setOfferForm({
      offer_code: '',
      name: '',
      description: '',
    });
    setEditingOffer(null);
  };

  const openBannerModal = (banner?: Banner) => {
    if (banner) {
      setBannerForm({
        title: banner.title,
        subtitle: banner.subtitle || '',
        offer_page_url: banner.offer_page_url,
        display_order: banner.display_order,
      });
      setEditingBanner(banner);
      if (banner.background_image) {
        setPreviewImage(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${banner.background_image}`);
      }
    } else {
      resetBannerForm();
    }
    setIsModalOpen(true);
  };

  const openOfferModal = (offer?: Offer) => {
    if (offer) {
      setOfferForm({
        offer_code: offer.offer_code,
        name: offer.name,
        description: offer.description,
      });
      setEditingOffer(offer);
    } else {
      resetOfferForm();
    }
    setIsOfferModalOpen(true);
  };

  if (loading) {
    return <div className="loading">Loading banner management...</div>;
  }

  return (
    <div className="banner-management">
      <div className="section-header">
        <h2>Banner & Offer Management</h2>
        <div className="header-actions">
          <button 
            className="btn-primary" 
            onClick={() => openOfferModal()}
          >
            Add Offer
          </button>
          <button 
            className="btn-primary" 
            onClick={() => openBannerModal()}
          >
            Add Banner
          </button>
        </div>
      </div>

      {/* Offers Section */}
      <div className="offers-section">
        <h3>Offers</h3>
        <div className="offers-grid">
          {offers.map((offer) => (
            <div key={offer.offer_code} className="offer-card">
              <div className="offer-header">
                <h4>{offer.name}</h4>
                <span className={`status ${offer.is_active ? 'active' : 'inactive'}`}>
                  {offer.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="offer-code">Code: {offer.offer_code}</p>
              <p className="offer-description">{offer.description}</p>
              <div className="offer-actions">
                <button onClick={() => openOfferModal(offer)}>Edit</button>
                <button 
                  onClick={() => handleDeleteOffer(offer.offer_code)}
                  className="btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Banners Section */}
      <div className="banners-section">
        <h3>Banners</h3>
        <div className="banners-grid">
          {banners.map((banner) => (
            <div key={banner.id} className="banner-card">
              <div className="banner-preview">
                {banner.background_image ? (
                  <img 
                    src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${banner.background_image}`}
                    alt={banner.title}
                    className="banner-image"
                  />
                ) : (
                  <div className="banner-placeholder">
                    <span>No Image</span>
                  </div>
                )}
                <div className="banner-content">
                  <h4>{banner.title}</h4>
                  {banner.subtitle && <p>{banner.subtitle}</p>}
                </div>
              </div>
              <div className="banner-info">
                <p><strong>Offer:</strong> {banner.offer_name}</p>
                <p><strong>Order:</strong> {banner.display_order}</p>
                <span className={`status ${banner.is_active ? 'active' : 'inactive'}`}>
                  {banner.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="banner-actions">
                <button onClick={() => openBannerModal(banner)}>Edit</button>
                <button 
                  onClick={() => handleDeleteBanner(banner.id)}
                  className="btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Banner Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingBanner ? 'Edit Banner' : 'Add Banner'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="close-btn">&times;</button>
            </div>
            
            {bannerError && (
              <div style={{ padding: '12px', marginBottom: '12px', backgroundColor: '#fee', border: '1px solid #fcc', color: '#c33', borderRadius: '4px', fontSize: '14px' }}>
                ⚠️ {bannerError}
              </div>
            )}
            
            {successMessage && (
              <div style={{ padding: '12px', marginBottom: '12px', backgroundColor: '#efe', border: '1px solid #cfc', color: '#3c3', borderRadius: '4px', fontSize: '14px' }}>
                ✅ {successMessage}
              </div>
            )}
            
            <form onSubmit={handleBannerSubmit}>
              <div className="form-group">
                <label htmlFor="title">Banner Title *</label>
                <input
                  type="text"
                  id="title"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="subtitle">Banner Subtitle</label>
                <input
                  type="text"
                  id="subtitle"
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="offer_page_url">Offer *</label>
                <select
                  id="offer_page_url"
                  value={bannerForm.offer_page_url}
                  onChange={(e) => setBannerForm({ ...bannerForm, offer_page_url: e.target.value })}
                  required
                >
                  <option value="">Select an offer</option>
                  {offers.filter(offer => offer.is_active).map((offer) => (
                    <option key={offer.offer_code} value={offer.offer_code}>
                      {offer.name} ({offer.offer_code})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="display_order">Display Order</label>
                <input
                  type="number"
                  id="display_order"
                  value={bannerForm.display_order}
                  onChange={(e) => setBannerForm({ ...bannerForm, display_order: parseInt(e.target.value) })}
                  min="0"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="background_image">Background Image</label>
                <input
                  type="file"
                  id="background_image"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {previewImage && (
                  <div className="image-preview">
                    <img src={previewImage} alt="Preview" />
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingBanner ? 'Update' : 'Create'} Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {isOfferModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingOffer ? 'Edit Offer' : 'Add Offer'}</h3>
              <button onClick={() => setIsOfferModalOpen(false)} className="close-btn">&times;</button>
            </div>
            
            {offerError && (
              <div style={{ padding: '12px', marginBottom: '12px', backgroundColor: '#fee', border: '1px solid #fcc', color: '#c33', borderRadius: '4px', fontSize: '14px' }}>
                ⚠️ {offerError}
              </div>
            )}
            
            {successMessage && (
              <div style={{ padding: '12px', marginBottom: '12px', backgroundColor: '#efe', border: '1px solid #cfc', color: '#3c3', borderRadius: '4px', fontSize: '14px' }}>
                ✅ {successMessage}
              </div>
            )}
            
            <form onSubmit={handleOfferSubmit}>
              <div className="form-group">
                <label htmlFor="offer_code">Offer Code *</label>
                <input
                  type="text"
                  id="offer_code"
                  value={offerForm.offer_code}
                  onChange={(e) => setOfferForm({ ...offerForm, offer_code: e.target.value })}
                  required
                  disabled={!!editingOffer}
                  placeholder="e.g., diwali50, summer25"
                />
                <small>Used in URL: /products/offers/{'{offer_code}'}</small>
              </div>
              
              <div className="form-group">
                <label htmlFor="offer_name">Offer Name *</label>
                <input
                  type="text"
                  id="offer_name"
                  value={offerForm.name}
                  onChange={(e) => setOfferForm({ ...offerForm, name: e.target.value })}
                  required
                  placeholder="e.g., Diwali Special - 50% Off"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="offer_description">Description</label>
                <textarea
                  id="offer_description"
                  value={offerForm.description}
                  onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                  placeholder="Describe the offer details"
                  rows={3}
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setIsOfferModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingOffer ? 'Update' : 'Create'} Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManagement;