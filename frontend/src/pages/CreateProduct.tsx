import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sellerAPI } from '../services/api';
import { CATEGORY_NAMES } from '../utils/categories';
import '../styles/CreateProduct.css';

interface ProductImage {
  id: string;
  file: File;
  preview: string;
  alt: string;
  customName: string;
  isPrimary: boolean;
}

interface ProductVideo {
  id: string;
  file: File;
  preview: string;
  title: string;
  customName: string;
}

interface ProductSize {
  id: string;
  size: string;
  colour: string;
  quantity: number;
  price?: number;
  market_price?: number;
  actual_buy_price?: number;
  cod_eligible?: boolean;
}

interface ProductFormData {
  name: string;
  product_id: string;
  description: string;
  category: string;
  other_details: string;
}

const CreateProduct: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    product_id: '',
    description: '',
    category: '',
    other_details: ''
  });

  const [images, setImages] = useState<ProductImage[]>([]);
  const [videos, setVideos] = useState<ProductVideo[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([{ id: '1', size: 'One Size', colour: 'Default', quantity: 0, price: 0, market_price: 0, actual_buy_price: 0, cod_eligible: true }]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > 10) {
      alert('Maximum 10 images allowed');
      return;
    }

    const newImages: ProductImage[] = files.map(file => ({
      id: Date.now() + Math.random().toString(),
      file,
      preview: URL.createObjectURL(file),
      alt: file.name,
      customName: file.name,
      isPrimary: images.length === 0 // First image is primary by default
    }));

    setImages(prev => [...prev, ...newImages]);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (videos.length + files.length > 2) {
      alert('Maximum 2 videos allowed');
      return;
    }

    const newVideos: ProductVideo[] = files.map(file => ({
      id: Date.now() + Math.random().toString(),
      file,
      preview: URL.createObjectURL(file),
      title: file.name,
      customName: file.name
    }));

    setVideos(prev => [...prev, ...newVideos]);
  };

  const removeImage = (id: string) => {
    const imageToRemove = images.find(img => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    
    const updatedImages = images.filter(img => img.id !== id);
    
    // If we removed the primary image, make the first remaining image primary
    if (imageToRemove?.isPrimary && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true;
    }
    
    setImages(updatedImages);
  };

  const removeVideo = (id: string) => {
    const videoToRemove = videos.find(vid => vid.id === id);
    if (videoToRemove) {
      URL.revokeObjectURL(videoToRemove.preview);
    }
    setVideos(videos.filter(vid => vid.id !== id));
  };

  const setPrimaryImage = (id: string) => {
    setImages(prev => prev.map(img => ({
      ...img,
      isPrimary: img.id === id
    })));
  };

  const updateImageAlt = (id: string, alt: string) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, alt } : img
    ));
  };

  const updateImageName = (id: string, customName: string) => {
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, customName } : img
    ));
  };

  const updateVideoTitle = (id: string, title: string) => {
    setVideos(prev => prev.map(vid => 
      vid.id === id ? { ...vid, title } : vid
    ));
  };

  const updateVideoName = (id: string, customName: string) => {
    setVideos(prev => prev.map(vid => 
      vid.id === id ? { ...vid, customName } : vid
    ));
  };

  // Size management functions
  const addSize = () => {
    const newSize: ProductSize = {
      id: Date.now().toString(),
      size: '',
      colour: 'Default',
      quantity: 0,
      price: 0,
      market_price: 0,
      actual_buy_price: 0,
      cod_eligible: true
    };
    setSizes(prev => [...prev, newSize]);
  };

  const removeSize = (id: string) => {
    if (sizes.length > 1) {
      setSizes(prev => prev.filter(size => size.id !== id));
    }
  };

  const updateSize = (id: string, field: 'size' | 'colour' | 'quantity' | 'price' | 'market_price' | 'actual_buy_price' | 'cod_eligible', value: string | number | boolean) => {
    setSizes(prev => prev.map(size => 
      size.id === id ? { ...size, [field]: value } : size
    ));
  };

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.description.trim()) newErrors.description = 'Product description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (images.length === 0) newErrors.images = 'At least one image is required';
    
    // Validate sizes with colours (parent->child relationship)
    const validSizes = sizes.filter(size => size.size.trim());
    if (validSizes.length === 0) {
      newErrors.sizes = 'At least one size is required';
    } else {
      // Check for duplicate (size, colour) combinations
      const sizeColourPairs = validSizes.map(size => 
        `${size.size.trim().toLowerCase()}|${(size.colour || 'Default').trim().toLowerCase()}`
      );
      const duplicatePairs = sizeColourPairs.filter((pair, index) => sizeColourPairs.indexOf(pair) !== index);
      if (duplicatePairs.length > 0) {
        newErrors.sizes = 'Duplicate size-colour combinations are not allowed';
      }
      
      // Check if all sizes have non-negative quantities
      if (validSizes.some(size => size.quantity < 0)) {
        newErrors.sizes = 'Size quantities cannot be negative';
      }
      
      // Check if all sizes have valid prices (greater than 0)
      if (validSizes.some(size => !size.price || size.price <= 0)) {
        newErrors.sizes = 'All sizes must have a selling price greater than 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // Add text fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value.toString());
      });

      // Add sizes data
      const validSizes = sizes.filter(size => size.size.trim()).map(size => ({
        size: size.size.trim(),
        colour: size.colour || 'Default',
        quantity: parseInt(size.quantity.toString()) || 0,
        price: parseFloat(size.price?.toString() || '0') || 0,
        market_price: parseFloat(size.market_price?.toString() || '0') || 0,
        actual_buy_price: parseFloat(size.actual_buy_price?.toString() || '0') || 0,
        cod_eligible: size.cod_eligible || false
      }));
      formDataToSend.append('sizes', JSON.stringify(validSizes));

      // Add base price (minimum price from sizes for backend compatibility)
      const minPrice = validSizes.reduce((min, size) => {
        const sizePrice = size.price;
        return min === 0 ? sizePrice : Math.min(min, sizePrice);
      }, 0);
      formDataToSend.append('price', minPrice.toString());

      // Calculate total stock quantity from sizes
      const totalStock = validSizes.reduce((total, size) => total + size.quantity, 0);
      formDataToSend.append('stock_quantity', totalStock.toString());

      // Debug: Log the data being sent
      console.log('Sending product data:', {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: minPrice,
        sizes: validSizes,
        totalStock,
        imagesCount: images.length,
        videosCount: videos.length
      });

      // Add images
      images.forEach((image, index) => {
        formDataToSend.append('images', image.file);
        formDataToSend.append(`imageData_${index}`, JSON.stringify({
          alt: image.alt,
          customName: image.customName,
          isPrimary: image.isPrimary
        }));
      });

      // Add videos
      videos.forEach((video, index) => {
        formDataToSend.append('videos', video.file);
        formDataToSend.append(`videoData_${index}`, JSON.stringify({
          title: video.title,
          customName: video.customName
        }));
      });

      await sellerAPI.createProduct(formDataToSend);
      
      alert('Product created successfully!');
      navigate('/seller/dashboard');
      
    } catch (error: any) {
      console.error('Error creating product:', error);
      
      // Show detailed error message from backend validation
      let errorMessage = 'Error creating product';
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const validationErrors = error.response.data.errors.map((err: any) => 
          `${err.param}: ${err.msg}`
        ).join(', ');
        errorMessage = `Validation errors: ${validationErrors}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Add New Product</h1>
          <p className="page-subtitle">Create a new product listing for your store</p>
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          <div className="form-grid">
            {/* Basic Information */}
            <div className="form-section">
              <h3>Basic Information</h3>
              
              <div className="form-group">
                <label htmlFor="name">Product Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`form-control ${errors.name ? 'error' : ''}`}
                  placeholder="Enter product name"
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="product_id">Product ID</label>
                <input
                  type="text"
                  id="product_id"
                  name="product_id"
                  value={formData.product_id}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Leave blank to auto-generate"
                />
                <small className="form-text">If left blank, will be auto-generated as PROD-XXXXXX</small>
              </div>

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`form-control ${errors.category ? 'error' : ''}`}
                >
                  <option value="">Select a category</option>
                  {CATEGORY_NAMES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && <span className="error-text">{errors.category}</span>}
              </div>
            </div>

            {/* Description */}
            <div className="form-section">
              <h3>Product Description</h3>
              
              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={`form-control ${errors.description ? 'error' : ''}`}
                  placeholder="Enter detailed product description"
                  rows={5}
                />
                {errors.description && <span className="error-text">{errors.description}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="other_details">Other Product Details</label>
                <textarea
                  id="other_details"
                  name="other_details"
                  value={formData.other_details}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Additional specifications, features, etc."
                  rows={3}
                />
              </div>
            </div>

            {/* Size-specific Pricing & Inventory */}
            <div className="form-section">
              <h3>Size-specific Pricing & Inventory</h3>
              
              <div className="form-group">
                <label>Size-specific Pricing & Inventory *</label>
                {sizes.map((size, index) => (
                  <div key={size.id} className="size-row">
                    <div className="size-inputs">
                      <div className="size-input-group">
                        <label>Size Name</label>
                        <input
                          type="text"
                          value={size.size}
                          onChange={(e) => updateSize(size.id, 'size', e.target.value)}
                          className="form-control size-name"
                          placeholder="Size name (e.g., M, L, XL, 38, 40)"
                        />
                      </div>
                      <div className="size-input-group">
                        <label>Colour</label>
                        <input
                          type="text"
                          value={size.colour || 'Default'}
                          onChange={(e) => updateSize(size.id, 'colour', e.target.value)}
                          className="form-control size-colour"
                          placeholder="Colour (e.g., Red, Blue, Black)"
                        />
                      </div>
                      <div className="size-input-group">
                        <label>Quantity</label>
                        <input
                          type="number"
                          value={size.quantity}
                          onChange={(e) => updateSize(size.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="form-control size-quantity"
                          placeholder="Quantity"
                          min="0"
                        />
                      </div>
                      <div className="size-input-group">
                        <label>Selling Price (AED)</label>
                        <input
                          type="number"
                          value={size.price || 0}
                          onChange={(e) => updateSize(size.id, 'price', parseFloat(e.target.value) || 0)}
                          className="form-control"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div className="size-input-group">
                        <label>Market Price (AED)</label>
                        <input
                          type="number"
                          value={size.market_price || 0}
                          onChange={(e) => updateSize(size.id, 'market_price', parseFloat(e.target.value) || 0)}
                          className="form-control"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                        <small className="form-hint">
                          Original/reference price for discount calculation. Leave 0 for auto-calculation.
                        </small>
                      </div>
                      <div className="size-input-group">
                        <label>Actual Buy Price (AED)</label>
                        <input
                          type="number"
                          value={size.actual_buy_price || 0}
                          onChange={(e) => updateSize(size.id, 'actual_buy_price', parseFloat(e.target.value) || 0)}
                          className="form-control"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div className="size-input-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={size.cod_eligible || false}
                            onChange={(e) => updateSize(size.id, 'cod_eligible', e.target.checked)}
                          />
                          <span className="checkmark"></span>
                          COD Eligible
                        </label>
                        <small className="form-hint">Allow cash on delivery for this size</small>
                      </div>
                      {size.market_price && size.price && size.market_price > size.price && (
                        <div className="size-input-group">
                          <label>% OFF</label>
                          <div className="discount-display">
                            {Math.round(((size.market_price - size.price) / size.market_price) * 100)}%
                          </div>
                        </div>
                      )}
                      {sizes.length > 1 && (
                        <div className="size-input-group">
                          <label>&nbsp;</label>
                          <button
                            type="button"
                            onClick={() => removeSize(size.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addSize}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '10px' }}
                >
                  + Add Another Size
                </button>
                
                {errors.sizes && <span className="error-text">{errors.sizes}</span>}
                
                <div className="size-summary">
                  <small className="form-text">
                    Total Stock: {sizes.reduce((total, size) => total + (parseInt(size.quantity.toString()) || 0), 0)} units
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Images Section */}
          <div className="form-section">
            <h3>Product Images * (Max 10)</h3>
            
            <div className="upload-area">
              <input
                type="file"
                id="images"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="images" className="upload-label">
                <div className="upload-icon">📷</div>
                <div>Click to upload images or drag and drop</div>
                <small>PNG, JPG, GIF up to 5MB each</small>
              </label>
            </div>
            
            {errors.images && <span className="error-text">{errors.images}</span>}
            
            {images.length > 0 && (
              <div className="media-grid">
                {images.map(image => (
                  <div key={image.id} className={`media-item ${image.isPrimary ? 'primary' : ''}`}>
                    <img src={image.preview} alt={image.alt} />
                    <div className="media-controls">
                      <input
                        type="text"
                        value={image.alt}
                        onChange={(e) => updateImageAlt(image.id, e.target.value)}
                        placeholder="Alt text"
                        className="alt-input"
                        style={{ marginBottom: '8px' }}
                      />
                      <div className="media-buttons">
                        {!image.isPrimary && (
                          <button
                            type="button"
                            onClick={() => setPrimaryImage(image.id)}
                            className="btn-primary-img"
                          >
                            Set as Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          className="btn-remove"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {image.isPrimary && <div className="primary-badge">Primary</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos Section */}
          <div className="form-section">
            <h3>Product Videos (Max 2)</h3>
            
            <div className="upload-area">
              <input
                type="file"
                id="videos"
                multiple
                accept="video/*"
                onChange={handleVideoUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor="videos" className="upload-label">
                <div className="upload-icon">🎥</div>
                <div>Click to upload videos or drag and drop</div>
                <small>MP4, MOV, AVI up to 50MB each</small>
              </label>
            </div>
            
            {videos.length > 0 && (
              <div className="media-grid">
                {videos.map(video => (
                  <div key={video.id} className="media-item">
                    <video src={video.preview} controls />
                    <div className="media-controls">
                      <input
                        type="text"
                        value={video.title}
                        onChange={(e) => updateVideoTitle(video.id, e.target.value)}
                        placeholder="Video title"
                        className="alt-input"
                        style={{ marginBottom: '8px' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeVideo(video.id)}
                        className="btn-remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Section */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/seller/dashboard')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Creating Product...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProduct;