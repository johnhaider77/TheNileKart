import React, { useState, useEffect } from 'react';
import { sellerAPI } from '../services/api';

interface Offer {
  offer_code: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface ProductOfferManagerProps {
  productId: string;
  onUpdate?: () => void;
}

const ProductOfferManager: React.FC<ProductOfferManagerProps> = ({
  productId,
  onUpdate
}) => {
  const [availableOffers, setAvailableOffers] = useState<Offer[]>([]);
  const [productOffers, setProductOffers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [offersRes, productOffersRes] = await Promise.all([
        sellerAPI.getOffers(),
        sellerAPI.getProductOffers(productId)
      ]);

      if (offersRes.data.success) {
        setAvailableOffers(offersRes.data.offers);
      }

      if (productOffersRes.data.success) {
        setProductOffers(productOffersRes.data.offers.map((offer: Offer) => offer.offer_code));
      }
    } catch (error) {
      console.error('Error fetching offers data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOfferChange = (offerCode: string, isSelected: boolean) => {
    if (isSelected) {
      setProductOffers(prev => [...prev, offerCode]);
    } else {
      setProductOffers(prev => prev.filter(code => code !== offerCode));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('💾 Saving product offers:', {
        productId,
        selectedOffers: productOffers,
        offerCount: productOffers.length
      });
      
      await sellerAPI.updateProductOffers(productId, productOffers);
      
      console.log('✅ Product offers saved successfully');
      
      if (onUpdate) {
        onUpdate();
      }
      
      // Show success message (you might want to use a toast/notification system)
      alert('Product offers updated successfully!');
    } catch (error) {
      console.error('❌ Error updating product offers:', error);
      alert('Failed to update product offers. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="offer-manager">
        <h4>Manage Offers</h4>
        <div className="loading-state">Loading offers...</div>
      </div>
    );
  }

  return (
    <div className="offer-manager">
      <div className="offer-header">
        <h4>Manage Offers</h4>
        <p className="offer-description">
          Tag this product to appear in specific offer pages
        </p>
      </div>

      {availableOffers.length > 0 ? (
        <div className="offers-list">
          {availableOffers.map((offer) => (
            <div key={offer.offer_code} className="offer-item">
              <label className="offer-checkbox">
                <input
                  type="checkbox"
                  checked={productOffers.includes(offer.offer_code)}
                  onChange={(e) => handleOfferChange(offer.offer_code, e.target.checked)}
                />
                <span className="checkmark"></span>
                <div className="offer-details">
                  <div className="offer-name">{offer.name}</div>
                  <div className="offer-code">Code: {offer.offer_code}</div>
                  {offer.description && (
                    <div className="offer-desc">{offer.description}</div>
                  )}
                </div>
              </label>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-offers">
          <p>No offers available. Create offers in Banner Management to tag products.</p>
        </div>
      )}

      <div className="offer-actions">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Offers'}
        </button>
      </div>
    </div>
  );
};

export default ProductOfferManager;