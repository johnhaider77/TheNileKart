import React, { useState } from 'react';
import promoCodeService from '../services/promoCodeService';
import './PromoCodeCheckout.css';

interface PromoCodeCheckoutProps {
  cartItems: any[];
  cartTotal: number;
  onPromoApplied: (discount: { id: number; code: string; discountAmount: number; finalTotal: number }) => void;
  onPromoRemoved: () => void;
}

const PromoCodeCheckout: React.FC<PromoCodeCheckoutProps> = ({
  cartItems,
  cartTotal,
  onPromoApplied,
  onPromoRemoved
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!promoCode.trim()) {
        setError('Please enter a promo code');
        setLoading(false);
        return;
      }

      const response = await promoCodeService.validatePromoCode(
        promoCode.toUpperCase(),
        cartItems,
        cartTotal
      );

      const { promoCode: result } = response.data;
      
      console.log('✅ Promo code applied:', result);
      
      setAppliedPromo(result);
      setSuccess(`Promo code applied! You saved ${result.discountAmount} AED`);
      setPromoCode('');

      onPromoApplied({
        id: result.id,
        code: result.code,
        discountAmount: result.discountAmount,
        finalTotal: result.finalTotal
      });
    } catch (err: any) {
      console.error('❌ Error applying promo code:', err);
      setError(
        err.response?.data?.message || 'Failed to apply promo code'
      );
      setAppliedPromo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setError('');
    setSuccess('');
    onPromoRemoved();
  };

  return (
    <div className="promo-code-checkout">
      {!appliedPromo ? (
        <form onSubmit={handleApplyPromo} className="promo-form">
          <div className="promo-input-group">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter promo code"
              className="promo-input"
              disabled={loading}
            />
            <button
              type="submit"
              className="promo-btn"
              disabled={loading || !promoCode.trim()}
            >
              {loading ? 'Applying...' : 'Apply'}
            </button>
          </div>
          {error && <div className="promo-error">{error}</div>}
          {success && <div className="promo-success">{success}</div>}
        </form>
      ) : (
        <div className="promo-applied">
          <div className="promo-applied-header">
            <div className="promo-badge">✓ {appliedPromo.code}</div>
            <button
              type="button"
              className="remove-btn"
              onClick={handleRemovePromo}
            >
              Remove
            </button>
          </div>
          <div className="promo-discount-summary">
            <div className="discount-row">
              <span className="discount-label">Original Total:</span>
              <span className="discount-value">{appliedPromo.originalTotal.toFixed(2)} AED</span>
            </div>
            <div className="discount-row discount-amount">
              <span className="discount-label">Discount:</span>
              <span className="discount-value">-{appliedPromo.discountAmount.toFixed(2)} AED</span>
            </div>
            <div className="discount-row final-total">
              <span className="discount-label">Final Total:</span>
              <span className="discount-value">{appliedPromo.finalTotal.toFixed(2)} AED</span>
            </div>
          </div>
          {success && <div className="promo-success">{success}</div>}
        </div>
      )}
    </div>
  );
};

export default PromoCodeCheckout;
