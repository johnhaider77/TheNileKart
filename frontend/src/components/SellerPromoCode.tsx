import React, { useState, useEffect } from 'react';
import promoCodeService from '../services/promoCodeService';
import './SellerPromoCode.css';

interface PromoCode {
  id: number;
  code: string;
  description: string;
  start_date_time: string;
  expiry_date_time: string;
  eligible_users: string[] | null;
  eligible_categories: string[] | null;
  percent_off: number;
  flat_off: number;
  max_off: number | null;
  min_purchase_value: number;
  max_uses_per_user: number | null;
  is_active: boolean;
}

const SellerPromoCode: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    start_date_time: '',
    expiry_date_time: '',
    eligible_users: '',
    eligible_categories: '',
    percent_off: 0,
    flat_off: 0,
    max_off: '',
    min_purchase_value: 0,
    max_uses_per_user: ''
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const response = await promoCodeService.getSellerPromoCodes();
      setPromoCodes(response.data.promoCodes || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch promo codes');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('_') && (name.includes('percent') || name.includes('flat') || name.includes('max') || name.includes('purchase') || name.includes('uses')) 
        ? (value === '' ? '' : parseFloat(value))
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let submitData: any = {
        description: formData.description,
        start_date_time: formData.start_date_time,
        expiry_date_time: formData.expiry_date_time,
        eligible_users: formData.eligible_users ? formData.eligible_users.split(',').map(e => e.trim()) : null,
        eligible_categories: formData.eligible_categories ? formData.eligible_categories.split(',').map(c => c.trim()) : null,
        percent_off: parseFloat(formData.percent_off.toString()) || 0,
        flat_off: parseFloat(formData.flat_off.toString()) || 0,
        max_off: formData.max_off ? parseFloat(formData.max_off.toString()) : null,
        min_purchase_value: parseFloat(formData.min_purchase_value.toString()) || 0,
        max_uses_per_user: formData.max_uses_per_user ? parseInt(formData.max_uses_per_user.toString()) : null
      };

      if (!editingId) {
        submitData.code = formData.code;
      }

      if (editingId) {
        await promoCodeService.updatePromoCode(editingId, submitData);
        setSuccess('Promo code updated successfully!');
      } else {
        await promoCodeService.createPromoCode(submitData);
        setSuccess('Promo code created successfully!');
      }

      await fetchPromoCodes();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save promo code');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (promo: PromoCode) => {
    setFormData({
      code: promo.code,
      description: promo.description,
      start_date_time: new Date(promo.start_date_time).toISOString().slice(0, 16),
      expiry_date_time: new Date(promo.expiry_date_time).toISOString().slice(0, 16),
      eligible_users: promo.eligible_users?.join(', ') || '',
      eligible_categories: promo.eligible_categories?.join(', ') || '',
      percent_off: promo.percent_off,
      flat_off: promo.flat_off,
      max_off: promo.max_off?.toString() || '',
      min_purchase_value: promo.min_purchase_value,
      max_uses_per_user: promo.max_uses_per_user?.toString() || ''
    });
    setEditingId(promo.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this promo code?')) {
      try {
        await promoCodeService.deletePromoCode(id);
        setSuccess('Promo code deleted successfully!');
        await fetchPromoCodes();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete promo code');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      start_date_time: '',
      expiry_date_time: '',
      eligible_users: '',
      eligible_categories: '',
      percent_off: 0,
      flat_off: 0,
      max_off: '',
      min_purchase_value: 0,
      max_uses_per_user: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="seller-promo-code-container">
      <div className="promo-header">
        <h2>Promo Code Management</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Create Promo Code'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="promo-form">
          <h3>{editingId ? 'Edit Promo Code' : 'Create New Promo Code'}</h3>

          <div className="form-row">
            <div className="form-group">
              <label>Code *</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="e.g., HELLO20"
                required
                disabled={!!editingId}
              />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="e.g., First five orders upto 20%"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date & Time *</label>
              <input
                type="datetime-local"
                name="start_date_time"
                value={formData.start_date_time}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Expiry Date & Time *</label>
              <input
                type="datetime-local"
                name="expiry_date_time"
                value={formData.expiry_date_time}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Percent Off (%)</label>
              <input
                type="number"
                name="percent_off"
                value={formData.percent_off}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Flat Off (AED)</label>
              <input
                type="number"
                name="flat_off"
                value={formData.flat_off}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Maximum Off (AED)</label>
              <input
                type="number"
                name="max_off"
                value={formData.max_off}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="e.g., 60"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Min Purchase Value (AED)</label>
              <input
                type="number"
                name="min_purchase_value"
                value={formData.min_purchase_value}
                onChange={handleInputChange}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Max Uses Per User</label>
              <input
                type="number"
                name="max_uses_per_user"
                value={formData.max_uses_per_user}
                onChange={handleInputChange}
                min="1"
                placeholder="e.g., 5"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full">
              <label>Eligible Users (emails separated by comma)</label>
              <textarea
                name="eligible_users"
                value={formData.eligible_users}
                onChange={handleInputChange}
                placeholder="e.g., user1@example.com, user2@example.com (leave empty for all users)"
                rows={2}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full">
              <label>Eligible Categories (names separated by comma)</label>
              <textarea
                name="eligible_categories"
                value={formData.eligible_categories}
                onChange={handleInputChange}
                placeholder="e.g., Electronics, Fashion (leave empty for all categories)"
                rows={2}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : editingId ? 'Update Promo Code' : 'Create Promo Code'}
            </button>
            <button type="button" className="btn btn-outline" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="promo-list">
        <h3>Your Promo Codes</h3>
        {promoCodes.length === 0 ? (
          <p className="empty-message">No promo codes created yet</p>
        ) : (
          <div className="promo-grid">
            {promoCodes.map(promo => (
              <div key={promo.id} className="promo-card">
                <div className="promo-header-card">
                  <h4>{promo.code}</h4>
                  <span className={`status ${promo.is_active ? 'active' : 'inactive'}`}>
                    {promo.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="description">{promo.description}</p>
                <div className="promo-details">
                  <div className="detail">
                    <span className="label">Discount:</span>
                    <span className="value">
                      {promo.percent_off > 0 ? `${promo.percent_off}% off` : `${promo.flat_off} AED off`}
                    </span>
                  </div>
                  <div className="detail">
                    <span className="label">Min Purchase:</span>
                    <span className="value">{promo.min_purchase_value} AED</span>
                  </div>
                  <div className="detail">
                    <span className="label">Valid Until:</span>
                    <span className="value">{new Date(promo.expiry_date_time).toLocaleDateString()}</span>
                  </div>
                  {promo.max_uses_per_user && (
                    <div className="detail">
                      <span className="label">Max Uses:</span>
                      <span className="value">{promo.max_uses_per_user}</span>
                    </div>
                  )}
                </div>
                <div className="promo-actions">
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => handleEdit(promo)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(promo.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerPromoCode;
