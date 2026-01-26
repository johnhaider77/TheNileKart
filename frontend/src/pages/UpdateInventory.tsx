import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/InventoryManagement.css';
import { sellerAPI } from '../services/api';
import ProductOfferManager from '../components/ProductOfferManager';
import SizeChartBuilder from '../components/SizeChartBuilder';

interface SizeChartData {
  rows: number;
  columns: number;
  headers?: string[];
  data: string[][];
}

interface Product {
  id: number;
  product_id: string;
  name: string;
  description: string;
  image_url: string;
  images?: any[];
  category: string;
  stock_quantity: number;
  other_details?: string;
  size_chart?: SizeChartData | null;
  sizes?: { size: string; colour?: string; quantity: number; price?: number; market_price?: number; actual_buy_price?: number; cod_eligible?: boolean; }[];
  is_active: boolean;
  created_at: string;
  cod_eligible?: boolean;
}

interface ProductSizeRow {
  product: Product;
  size: string;
  colour: string;
  sizeQuantity: number;
  sizePrice: number;
  isFirstSizeRow: boolean;
  sizeRowCount: number;
}

interface FilterCriteria {
  productId: string;
  name: string;
  category: string;
  minStock: string;
  maxStock: string;
  status: string;
}

interface BulkUpdateData {
  stock?: number;
  category?: string;
  active?: boolean;
}

interface EditingProduct extends Product {
  tempStock?: number;
}

const UpdateInventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState<FilterCriteria>({
    productId: '',
    name: '',
    category: '',
    minStock: '',
    maxStock: '',
    status: 'all'
  });

  // Selection and bulk update states
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [bulkUpdateData, setBulkUpdateData] = useState<BulkUpdateData>({});
  
  // Edit modal states
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Product>>({});
  const [editImages, setEditImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageAltTexts, setImageAltTexts] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [originalExistingImages, setOriginalExistingImages] = useState<any[]>([]); // Track original for detecting changes
  const [deletedImages, setDeletedImages] = useState<string[]>([]);
  const [pendingSizeChanges, setPendingSizeChanges] = useState<{
    [productId: number]: {
      [size: string]: {
        market_price?: number;
        actual_buy_price?: number;
        cod_eligible?: boolean;
      }
    }
  }>({});
  const [editingSizeChart, setEditingSizeChart] = useState(false);
  const [editSizeChart, setEditSizeChart] = useState<SizeChartData | null>(null);
  const [showSizeChartBuilder, setShowSizeChartBuilder] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 25;

  // Debounce timers for colour changes
  const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});
  
  // Track original colours for editing (to maintain correct API calls)
  const [colourEdits, setColourEdits] = useState<{ [key: string]: string }>({});

  const categories = [
    'Mobiles, Tablets & Accessories',
    'Computers & Office Supplies', 
    'TV, Appliances & Electronics',
    "Women's Fashion",
    "Men's Fashion",
    'Kids Fashion',
    'Health, Beauty & Perfumes',
    'Intimacy',
    'Grocery',
    'Home, Kitchen & Pets',
    'Tools & Home Improvement',
    'Toys, Games & Baby',
    'Sports, Fitness & Outdoors',
    'Books',
    'Video Games',
    'Automotive'
  ];

  // Helper function to get first image URL
  const getFirstImageUrl = (product: Product): string => {
    // First, try to get the first image from the images array
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      const firstImage = product.images[0];
      if (typeof firstImage === 'object' && firstImage.url) {
        return firstImage.url.startsWith('http') ? firstImage.url : `http://localhost:5000${firstImage.url}`;
      }
      if (typeof firstImage === 'string') {
        return firstImage.startsWith('http') ? firstImage : `http://localhost:5000${firstImage}`;
      }
    }
    
    // Fallback to image_url field
    if (product.image_url && product.image_url.trim() !== '') {
      return product.image_url.startsWith('http') ? product.image_url : `http://localhost:5000${product.image_url}`;
    }
    
    // Default to placeholder
    return '/placeholder-image.jpg';
  };

  // Helper function to expand products by their sizes
  const expandProductsBySizes = (products: Product[]): ProductSizeRow[] => {
    const expandedRows: ProductSizeRow[] = [];
    
    products.forEach(product => {
      if (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
        product.sizes.forEach((sizeData, index) => {
          expandedRows.push({
            product,
            size: sizeData.size,
            colour: sizeData.colour || 'Default',
            sizeQuantity: sizeData.quantity,
            sizePrice: sizeData.price || 0, // Use size-specific price
            isFirstSizeRow: index === 0,
            sizeRowCount: product.sizes!.length
          });
        });
      } else {
        // Product has no sizes, show as single row with default size
        expandedRows.push({
          product,
          size: 'One Size',
          colour: 'Default',
          sizeQuantity: product.stock_quantity,
          sizePrice: 0, // No global price, will need to be set per size
          isFirstSizeRow: true,
          sizeRowCount: 1
        });
      }
    });
    
    return expandedRows;
  };

  useEffect(() => {
    loadProducts();
    
    // Check authentication status
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('⚠️ No authentication token found');
      setError('Please log in as a seller to manage inventory');
    } else {
      console.log('🔑 Authentication token found');
    }
  }, [currentPage, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup debounce timers on component unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in as a seller to access inventory management.');
        window.location.href = '/seller-login';
        return;
      }

      const response = await sellerAPI.searchProducts({
        page: currentPage,
        limit: itemsPerPage,
        ...(filters.productId && { product_id: filters.productId }),
        ...(filters.name && { name: filters.name }),
        ...(filters.category && { category: filters.category }),
        ...(filters.minStock && { min_stock: parseInt(filters.minStock) }),
        ...(filters.maxStock && { max_stock: parseInt(filters.maxStock) }),
        ...(filters.status !== 'all' && { is_active: filters.status === 'active' })
      });
      
      setProducts(response.data.products || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Error loading products:', err);
      
      // Handle different types of errors
      if (err?.response?.status === 401) {
        setError('Authentication expired. Please log in again.');
        localStorage.removeItem('token');
        window.location.href = '/seller-login';
      } else if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        setError('Unable to connect to server. Please check your internet connection and try again.');
      } else if (err?.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load products. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterCriteria, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      productId: '',
      name: '',
      category: '',
      minStock: '',
      maxStock: '',
      status: 'all'
    });
    setCurrentPage(1);
  };

  const handleSelectProduct = (productId: number, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(products.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleStockChange = async (productId: number, newStock: number) => {
    try {
      await sellerAPI.updateProductFields(productId.toString(), { stock_quantity: newStock });
      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, stock_quantity: newStock }
          : p
      ));
      showSuccess('Stock quantity updated successfully');
    } catch (err) {
      setError('Failed to update stock quantity');
      console.error('Error updating stock:', err);
    }
  };

  const handleSizeStockChange = async (productId: number, size: string, colour: string, newQuantity: number) => {
    try {
      await sellerAPI.updateProductSizeQuantity(productId.toString(), size, colour, newQuantity);
      
      // Update the product sizes in state
      setProducts(prev => prev.map(product => {
        if (product.id === productId && product.sizes) {
          const updatedSizes = product.sizes.map(sizeData => 
            (sizeData.size === size && (sizeData.colour || 'Default') === colour)
              ? { ...sizeData, quantity: newQuantity }
              : sizeData
          );
          
          // Recalculate total stock quantity
          const totalStock = updatedSizes.reduce((sum, sizeData) => sum + sizeData.quantity, 0);
          
          return {
            ...product,
            sizes: updatedSizes,
            stock_quantity: totalStock
          };
        }
        return product;
      }));
      
      showSuccess(`Stock for ${size} (${colour}) updated successfully`);
    } catch (err) {
      setError(`Failed to update stock for ${size} (${colour})`);
      console.error('Error updating size stock:', err);
    }
  };

  const handleSizePriceChange = async (productId: number, size: string, colour: string, newPrice: number) => {
    try {
      console.log(`🔄 Updating price for product ${productId}, size ${size} (${colour}), new price: ${newPrice}`);
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }
      
      // Update size-specific price
      console.log('📝 Updating size-specific price...');
      await sellerAPI.updateProductSizePrice(productId.toString(), size, colour, newPrice);
      
      // Update the product sizes in state
      setProducts(prev => prev.map(product => {
        if (product.id === productId && product.sizes) {
          const updatedSizes = product.sizes.map(sizeData => 
            (sizeData.size === size && (sizeData.colour || 'Default') === colour)
              ? { ...sizeData, price: newPrice }
              : sizeData
          );
          
          console.log('📊 Updated sizes array:', updatedSizes);
          
          return {
            ...product,
            sizes: updatedSizes
          };
        }
        return product;
      }));
      
      console.log('✅ Size-specific price updated successfully');
      showSuccess(`Price for ${size} (${colour}) updated successfully`);
    } catch (err: any) {
      console.error('❌ Error updating size price:', err);
      
      // Provide more detailed error information
      let errorMessage = `Failed to update price for ${size} (${colour})`;
      if (err?.response?.data?.message) {
        errorMessage += `: ${err.response.data.message}`;
      } else if (err?.response?.status === 401) {
        errorMessage += ': Authentication required. Please log in again.';
      } else if (err?.response?.status === 403) {
        errorMessage += ': Access denied. You may not own this product.';
      } else if (err?.response?.status === 404) {
        errorMessage += ': Product or size not found.';
      } else if (err?.message) {
        errorMessage += `: ${err.message}`;
      }
      
      setError(errorMessage);
    }
  };

  // Handle price input commit with validation
  const handlePriceInputBlur = async (productId: number, size: string, colour: string, inputValue: string, currentPrice: number) => {
    const newPrice = parseFloat(inputValue);
    if (!isNaN(newPrice) && newPrice >= 0 && newPrice !== currentPrice) {
      console.log(`💰 Price change detected: ${currentPrice} → ${newPrice} for product ${productId}, size ${size} (${colour})`);
      
      // Add validation
      if (newPrice < 0) {
        setError('Price cannot be negative');
        return;
      }
      if (newPrice > 999999) {
        setError('Price too large');
        return;
      }
      
      await handleSizePriceChange(productId, size, colour, newPrice);
    } else {
      console.log(`💰 No price change needed: ${currentPrice} (input: ${inputValue}, parsed: ${newPrice})`);
    }
  };

  // Handle market price changes for sizes - only update local state
  const handleSizeMarketPriceChange = (productId: number, size: string, newMarketPrice: number) => {
    console.log(`📝 Tracking market price change for product ${productId}, size ${size}: ${newMarketPrice}`);
    
    // Update pending changes
    setPendingSizeChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [size]: {
          ...prev[productId]?.[size],
          market_price: newMarketPrice
        }
      }
    }));

    // Update the product sizes in local state for immediate UI feedback
    if (editingProduct && editingProduct.id === productId) {
      setEditingProduct(prev => {
        if (!prev || !prev.sizes) return prev;
        
        const updatedSizes = prev.sizes.map(sizeData => 
          sizeData.size === size 
            ? { ...sizeData, market_price: newMarketPrice }
            : sizeData
        );
        
        return {
          ...prev,
          sizes: updatedSizes
        };
      });
    }
  };

  // Handle actual buy price changes for sizes - only update local state
  const handleSizeActualBuyPriceChange = (productId: number, size: string, newActualBuyPrice: number) => {
    console.log(`📝 Tracking actual buy price change for product ${productId}, size ${size}: ${newActualBuyPrice}`);
    
    // Update pending changes
    setPendingSizeChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [size]: {
          ...prev[productId]?.[size],
          actual_buy_price: newActualBuyPrice
        }
      }
    }));

    // Update the product sizes in local state for immediate UI feedback
    if (editingProduct && editingProduct.id === productId) {
      setEditingProduct(prev => {
        if (!prev || !prev.sizes) return prev;
        
        const updatedSizes = prev.sizes.map(sizeData => 
          sizeData.size === size 
            ? { ...sizeData, actual_buy_price: newActualBuyPrice }
            : sizeData
        );
        
        return {
          ...prev,
          sizes: updatedSizes
        };
      });
    }
  };

  // Handle COD eligibility changes for sizes - only update local state
  const handleSizeCODEligibilityChange = (productId: number, size: string, codEligible: boolean) => {
    console.log(`📝 Tracking COD eligibility change for product ${productId}, size ${size}: ${codEligible}`);
    
    // Update pending changes
    setPendingSizeChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [size]: {
          ...prev[productId]?.[size],
          cod_eligible: codEligible
        }
      }
    }));

    // Update the product sizes in local state for immediate UI feedback
    if (editingProduct && editingProduct.id === productId) {
      setEditingProduct(prev => {
        if (!prev || !prev.sizes) return prev;
        
        const updatedSizes = prev.sizes.map(sizeData => 
          sizeData.size === size 
            ? { ...sizeData, cod_eligible: codEligible }
            : sizeData
        );
        
        return {
          ...prev,
          sizes: updatedSizes
        };
      });
    }
  };

  const handleSizeColourChange = useCallback((productId: number, size: string, oldColour: string, newColour: string) => {
    // Immediately update UI with the new colour
    setEditingProduct(prev => {
      if (!prev || !prev.sizes) return prev;
      
      const updatedSizes = prev.sizes.map(sizeData => 
        (sizeData.size === size && (sizeData.colour || 'Default') === oldColour)
          ? { ...sizeData, colour: newColour }
          : sizeData
      );
      
      return {
        ...prev,
        sizes: updatedSizes
      };
    });

    setProducts(prev => prev.map(product => {
      if (product.id === productId && product.sizes) {
        const updatedSizes = product.sizes.map(sizeData => 
          (sizeData.size === size && (sizeData.colour || 'Default') === oldColour)
            ? { ...sizeData, colour: newColour }
            : sizeData
        );
        
        return {
          ...product,
          sizes: updatedSizes
        };
      }
      return product;
    }));

    // Debounce the API call
    const debounceKey = `${productId}-${size}-${oldColour}`;
    if (debounceTimers.current[debounceKey]) {
      clearTimeout(debounceTimers.current[debounceKey]);
    }

    debounceTimers.current[debounceKey] = setTimeout(async () => {
      try {
        await sellerAPI.updateProductSizeColour(productId.toString(), size, oldColour, newColour);
        showSuccess(`Colour for ${size} updated to ${newColour} successfully`);
      } catch (err) {
        setError(`Failed to update colour for ${size}`);
        console.error('Error updating size colour:', err);
      }
    }, 800); // 800ms debounce delay
  }, []);

  const handleStatusToggle = async (productId: number, active: boolean) => {
    try {
      await sellerAPI.toggleProduct(productId.toString());
      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, is_active: !p.is_active }
          : p
      ));
      showSuccess(`Product ${!active ? 'activated' : 'deactivated'} successfully`);
    } catch (err) {
      setError('Failed to update product status');
      console.error('Error updating status:', err);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedProducts.size === 0) {
      setError('Please select products to update');
      return;
    }

    const updateData = Object.entries(bulkUpdateData)
      .filter(([_, value]) => value !== undefined && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    if (Object.keys(updateData).length === 0) {
      setError('Please specify fields to update');
      return;
    }

    try {
      setLoading(true);
      const productIds = Array.from(selectedProducts).map(id => id.toString());
      const bulkData = {
        ...(bulkUpdateData.stock && { stock_quantity: bulkUpdateData.stock }),
        ...(bulkUpdateData.category && { category: bulkUpdateData.category }),
        ...(bulkUpdateData.active !== undefined && { is_active: bulkUpdateData.active })
      };
      await sellerAPI.bulkUpdateProducts(productIds, bulkData);
      
      // Refresh the products list
      await loadProducts();
      
      // Clear selections and bulk update data
      setSelectedProducts(new Set());
      setBulkUpdateData({});
      
      showSuccess(`Updated ${productIds.length} products successfully`);
    } catch (err) {
      setError('Failed to perform bulk update');
      console.error('Error in bulk update:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkActivate = async () => {
    setBulkUpdateData(prev => ({ ...prev, active: true }));
    await handleBulkUpdate();
  };

  const handleBulkDeactivate = async () => {
    setBulkUpdateData(prev => ({ ...prev, active: false }));
    await handleBulkUpdate();
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({ ...product });
    setEditSizeChart(product.size_chart || null);
    setShowSizeChartBuilder(false);
    
    // Load existing images and ensure they have unique IDs
    if (product.images && Array.isArray(product.images)) {
      const imagesWithIds = product.images.map((image, index) => ({
        ...image,
        id: image.id || `existing_${index}_${Date.now()}`,
        index: index // Keep track of original index
      }));
      setExistingImages(imagesWithIds);
      // Store original for change detection
      setOriginalExistingImages(JSON.parse(JSON.stringify(imagesWithIds)));
    } else {
      setExistingImages([]);
      setOriginalExistingImages([]);
    }
    
    // Clear any new image state
    setEditImages([]);
    setImagePreviews([]);
    setImageAltTexts([]);
    setDeletedImages([]);
  };

  const closeEditModal = () => {
    setEditingProduct(null);
    setEditFormData({});
    setEditImages([]);
    setImagePreviews([]);
    setImageAltTexts([]);
    setExistingImages([]);
    setOriginalExistingImages([]);
    setDeletedImages([]);
    setEditSizeChart(null);
    setShowSizeChartBuilder(false);
    setColourEdits({});
    // Clear any pending size changes for the product being closed
    if (editingProduct) {
      setPendingSizeChanges(prev => {
        const updated = { ...prev };
        delete updated[editingProduct.id];
        return updated;
      });
    }
  };

  // Image handling functions for edit modal
  const handleEditImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalImages = existingImages.length + editImages.length + newFiles.length;
    
    if (totalImages > 10) {
      setError('You can have a maximum of 10 images per product');
      return;
    }

    setEditImages(prev => [...prev, ...newFiles]);
    setImageAltTexts(prev => [...prev, ...newFiles.map(() => '')]);

    // Generate previews for new files
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreviews(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEditImage = (index: number) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageAltTexts(prev => prev.filter((_, i) => i !== index));
  };

  const updateImageAltText = (index: number, altText: string) => {
    setImageAltTexts(prev => {
      const updated = [...prev];
      updated[index] = altText;
      return updated;
    });
  };

  const moveExistingImage = (fromIndex: number, toIndex: number) => {
    const updatedImages = [...existingImages];
    const [movedImage] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedImage);
    setExistingImages(updatedImages);
  };

  const removeExistingImage = (imageId: string | number, imageIndex?: number) => {
    setExistingImages(prev => {
      const filtered = prev.filter(img => img.id !== imageId);
      console.log('Removing image:', { imageId, imageIndex, before: prev.length, after: filtered.length });
      return filtered;
    });
    
    // Track deletion by both ID and index for backend processing
    setDeletedImages(prev => {
      const newDeleted = [...prev];
      // Add ID if it exists
      if (imageId) {
        newDeleted.push(imageId.toString());
      }
      // Also track by index if provided
      if (imageIndex !== undefined) {
        newDeleted.push(`index_${imageIndex}`);
      }
      console.log('Deleted images list:', newDeleted);
      return newDeleted;
    });
  };

  const handleEditSave = async () => {
    if (!editingProduct) return;

    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      // Prepare form data for product update including images
      const formData = new FormData();
      
      // Only send fields that should be updated (exclude read-only fields)
      const allowedFields = ['name', 'description', 'category', 'product_id', 'stock_quantity', 'actual_buy_price', 'other_details', 'cod_eligible'];
      
      Object.keys(editFormData).forEach(key => {
        if (allowedFields.includes(key) && editFormData[key as keyof Product] !== undefined) {
          const value = editFormData[key as keyof Product];
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        }
      });
      
      // Handle price field - use the main product price (not size-specific prices)
      // The backend will use size-specific market_price and actual_buy_price for transactions
      let priceToSend = (editingProduct as any).price;
      
      // Ensure we have a valid price
      if (!priceToSend || priceToSend <= 0) {
        // Fallback: try to get from editFormData
        priceToSend = (editFormData as any).price;
      }
      
      // Final validation - must be a positive number
      if (!priceToSend || priceToSend <= 0) {
        // If no price available, throw error instead of using fallback
        throw new Error('Product price must be greater than 0. Please check your product data.');
      }
      
      formData.append('price', String(parseFloat(priceToSend).toFixed(2)));
      
      // Add new images with alt text and custom names
      editImages.forEach((image, index) => {
        formData.append('images', image);
        // Send image metadata including customName, alt text, and primary flag
        formData.append(`imageData_${index}`, JSON.stringify({
          customName: (image as any).customName || image.name,
          alt: imageAltTexts[index] || '',
          isPrimary: false
        }));
      });
      
      // Detect and send changes to existing images (alt text changes that require S3 renames)
      const renamedExistingImages: any[] = [];
      existingImages.forEach((image, index) => {
        const originalImage = originalExistingImages[index];
        // Check if alt text has changed
        if (originalImage && (image.alt !== originalImage.alt || image.alt !== originalImage.displayName)) {
          renamedExistingImages.push({
            id: image.id,
            url: image.url,
            oldAlt: originalImage.alt || originalImage.displayName,
            newAlt: image.alt || image.name,
            displayName: image.displayName || originalImage.displayName
          });
        }
      });
      
      if (renamedExistingImages.length > 0) {
        formData.append('renamedExistingImages', JSON.stringify(renamedExistingImages));
        console.log('📝 Existing images with alt text changes:', renamedExistingImages);
      }
      
      // Add existing images order and deletions
      formData.append('existingImages', JSON.stringify(existingImages));
      formData.append('deletedImages', JSON.stringify(deletedImages));

      // Add size chart if it was modified
      if (editSizeChart) {
        formData.append('sizeChart', JSON.stringify(editSizeChart));
      }

      console.log('Saving product with image changes:', {
        productId: editingProduct.id,
        editFormDataKeys: Object.keys(editFormData),
        hasSizes: editingProduct.sizes && editingProduct.sizes.length > 0,
        sizesCount: editingProduct.sizes?.length || 0,
        existingImagesCount: existingImages.length,
        newImagesCount: editImages.length,
        deletedImagesCount: deletedImages.length,
        deletedImages: deletedImages
      });

      // Log the price being sent for debugging
      const sentPrice = formData.get('price');
      console.log('Price being sent to backend:', sentPrice);

      // Update product with images
      const response = await sellerAPI.updateProduct(editingProduct.id.toString(), formData);
      
      // Then, save all pending size-specific pricing changes
      const productPendingChanges = pendingSizeChanges[editingProduct.id];
      if (productPendingChanges) {
        console.log('💾 Saving pending size-specific price changes...', productPendingChanges);
        
        for (const [size, changes] of Object.entries(productPendingChanges)) {
          try {
            // Find the colour for this size from the editingProduct
            const sizeData = editingProduct.sizes?.find(s => s.size === size);
            const colour = sizeData?.colour || 'Default';
            
            // Save market price if it was changed
            if (changes.market_price !== undefined) {
              console.log(`💰 Saving market price for ${size} (${colour}): ${changes.market_price}`);
              await sellerAPI.updateProductSizeMarketPrice(editingProduct.id.toString(), size, colour, changes.market_price);
            }
            
            // Save actual buy price if it was changed
            if (changes.actual_buy_price !== undefined) {
              console.log(`💰 Saving actual buy price for ${size} (${colour}): ${changes.actual_buy_price}`);
              await sellerAPI.updateProductSizeActualBuyPrice(editingProduct.id.toString(), size, colour, changes.actual_buy_price);
            }

            // Save COD eligibility if it was changed
            if (changes.cod_eligible !== undefined) {
              console.log(`📦 Saving COD eligibility for ${size} (${colour}): ${changes.cod_eligible}`);
              await sellerAPI.updateProductSizeCODEligibility(editingProduct.id.toString(), size, colour, changes.cod_eligible);
            }
          } catch (sizeErr: any) {
            console.error(`❌ Error saving price for ${size}:`, sizeErr);
            throw new Error(`Failed to save prices for ${size}: ${sizeErr?.response?.data?.message || sizeErr.message}`);
          }
        }
        
        // Clear pending changes for this product
        setPendingSizeChanges(prev => {
          const updated = { ...prev };
          delete updated[editingProduct.id];
          return updated;
        });
      }
      
      // Update the product in the main products list with both main fields, size changes, and images
      setProducts(prev => prev.map(p => {
        if (p.id === editingProduct.id) {
          let updatedProduct = { ...p, ...editFormData };
          
          // Update images from server response
          if (response.data && response.data.product) {
            updatedProduct.images = response.data.product.images || [];
            console.log('Updated product images from server:', updatedProduct.images);
          } else {
            // Fallback: apply the changes manually if server doesn't return updated images
            updatedProduct.images = existingImages;
            console.log('Using existing images as fallback:', existingImages);
          }
          
          // Apply size-specific changes to the product
          if (productPendingChanges && p.sizes) {
            updatedProduct.sizes = p.sizes.map(sizeData => {
              const sizeChanges = productPendingChanges[sizeData.size];
              if (sizeChanges) {
                return {
                  ...sizeData,
                  ...(sizeChanges.market_price !== undefined && { market_price: sizeChanges.market_price }),
                  ...(sizeChanges.actual_buy_price !== undefined && { actual_buy_price: sizeChanges.actual_buy_price })
                };
              }
              return sizeData;
            });
          }
          
          return updatedProduct;
        }
        return p;
      }));
      
      closeEditModal();
      showSuccess('Product updated successfully with image changes');
      
      // Force a refresh of the products list to ensure changes are reflected
      await loadProducts();
    } catch (err: any) {
      console.error('❌ Error updating product:', err);
      
      // Show detailed error message from backend validation
      let errorMessage = 'Failed to update product';
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const validationErrors = err.response.data.errors.map((error: any) => 
          `${error.param}: ${error.msg}`
        ).join(', ');
        errorMessage = `Validation errors: ${validationErrors}`;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  const getStockBadge = (stock: number) => {
    if (stock > 50) return 'high';
    if (stock > 10) return 'medium';
    return 'low';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (loading && products.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="inventory-management">
      <div className="inventory-header">
        <div>
          <h1 className="inventory-title">Inventory Management</h1>
          <p className="inventory-subtitle">Manage your product inventory, stock levels, and product details</p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
          <button onClick={() => setSuccess(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Filters Section */}
      <div className="filters-section">
        <h3 className="filters-title">Filter Products</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Product ID</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Enter product ID"
              value={filters.productId}
              onChange={(e) => handleFilterChange('productId', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Product Name</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Enter product name"
              value={filters.name}
              onChange={(e) => handleFilterChange('name', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Category</label>
            <select
              className="filter-select"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Min Stock</label>
            <input
              type="number"
              className="filter-input"
              placeholder="Minimum stock"
              value={filters.minStock}
              onChange={(e) => handleFilterChange('minStock', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Max Stock</label>
            <input
              type="number"
              className="filter-input"
              placeholder="Maximum stock"
              value={filters.maxStock}
              onChange={(e) => handleFilterChange('maxStock', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select
              className="filter-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All Products</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
        <div className="filters-actions">
          <button className="filter-btn primary" onClick={loadProducts}>
            Apply Filters
          </button>
          <button className="filter-btn secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Bulk Actions Section */}
      <div className={`bulk-actions ${selectedProducts.size > 0 ? 'active' : ''}`}>
        <h3 className="bulk-title">Bulk Actions</h3>
        
        {selectedProducts.size > 0 && (
          <div className="selected-count">
            {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
          </div>
        )}

        <div className="bulk-controls">
          <div className="filter-group">
            <label>Bulk Stock Update</label>
            <input
              type="number"
              className="filter-input"
              placeholder="New stock quantity"
              value={bulkUpdateData.stock || ''}
              onChange={(e) => setBulkUpdateData(prev => ({ ...prev, stock: parseInt(e.target.value) || undefined }))}
            />
          </div>
          <div className="filter-group">
            <label>Bulk Category Update</label>
            <select
              className="filter-select"
              value={bulkUpdateData.category || ''}
              onChange={(e) => setBulkUpdateData(prev => ({ ...prev, category: e.target.value || undefined }))}
            >
              <option value="">Keep current</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bulk-actions-row">
          <button 
            className="bulk-btn update"
            onClick={handleBulkUpdate}
            disabled={selectedProducts.size === 0}
          >
            Apply Bulk Updates
          </button>
          <button 
            className="bulk-btn activate"
            onClick={handleBulkActivate}
            disabled={selectedProducts.size === 0}
          >
            Activate Selected
          </button>
          <button 
            className="bulk-btn deactivate"
            onClick={handleBulkDeactivate}
            disabled={selectedProducts.size === 0}
          >
            Deactivate Selected
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th className="checkbox-cell">
                <input
                  type="checkbox"
                  className="product-checkbox"
                  checked={products.length > 0 && selectedProducts.size === products.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th>Image</th>
              <th>Product ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Size</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expandProductsBySizes(products).map((row, index) => {
              const { product, size, colour, sizeQuantity, sizePrice, isFirstSizeRow, sizeRowCount } = row;
              return (
                <tr key={`${product.id}-${size}-${colour}`}>
                  {/* Checkbox - only show on first size row */}
                  {isFirstSizeRow && (
                    <td className="checkbox-cell" rowSpan={sizeRowCount}>
                      <input
                        type="checkbox"
                        className="product-checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                      />
                    </td>
                  )}
                  
                  {/* Image - only show on first size row */}
                  {isFirstSizeRow && (
                    <td rowSpan={sizeRowCount}>
                      <img 
                        src={getFirstImageUrl(product)} 
                        alt={product.name}
                        className="product-image"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== window.location.origin + '/placeholder-image.jpg') {
                            target.src = '/placeholder-image.jpg';
                          }
                        }}
                      />
                    </td>
                  )}
                  
                  {/* Product ID - only show on first size row */}
                  {isFirstSizeRow && (
                    <td rowSpan={sizeRowCount}>
                      <div className="product-id">#{product.product_id}</div>
                    </td>
                  )}
                  
                  {/* Name - only show on first size row */}
                  {isFirstSizeRow && (
                    <td rowSpan={sizeRowCount}>
                      <div className="product-name">{product.name}</div>
                    </td>
                  )}
                  
                  {/* Category - only show on first size row */}
                  {isFirstSizeRow && (
                    <td rowSpan={sizeRowCount}>{product.category}</td>
                  )}
                  
                  {/* Size - show for each size row */}
                  <td>
                    <div className="size-info">
                      <span className="size-name">{size}</span>
                      {colour !== 'Default' && <span className="colour-badge" style={{ marginLeft: '0.5rem' }}>{colour}</span>}
                    </div>
                  </td>
                  
                  {/* Price - show size-specific price for each row with editable input */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        className="price-input"
                        key={`price-${product.id}-${size}-${colour}-${sizePrice}`} // Force re-render when price changes
                        defaultValue={sizePrice}
                        onBlur={(e) => handlePriceInputBlur(product.id, size, colour, e.target.value, sizePrice)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </td>
                  
                  {/* Stock - show for each size row with size-specific quantity */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        className="stock-input"
                        value={sizeQuantity}
                        onChange={(e) => handleSizeStockChange(product.id, size, colour, parseInt(e.target.value) || 0)}
                        min="0"
                      />
                      <span className={`stock-badge ${getStockBadge(sizeQuantity)}`}>
                        {sizeQuantity > 50 ? 'High' : sizeQuantity > 10 ? 'Med' : 'Low'}
                      </span>
                    </div>
                  </td>
                  
                  {/* Status - only show on first size row */}
                  {isFirstSizeRow && (
                    <td rowSpan={sizeRowCount}>
                      <div className="status-toggle">
                        <div 
                          className={`toggle-switch ${product.is_active ? 'active' : ''}`}
                          onClick={() => handleStatusToggle(product.id, product.is_active)}
                        >
                          <div className="toggle-slider"></div>
                        </div>
                        <span style={{ fontSize: '0.875rem', color: product.is_active ? '#22543d' : '#742a2a' }}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                  )}
                  
                  {/* Actions - only show on first size row */}
                  {isFirstSizeRow && (
                    <td rowSpan={sizeRowCount}>
                      <div className="action-buttons">
                        <button 
                          className="action-btn edit"
                          onClick={() => openEditModal(product)}
                          title="Edit Product"
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Page {currentPage} of {totalPages}
          </div>
          <div className="pagination-controls">
            <button 
              className="pagination-btn"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </button>
            <button 
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button 
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
            <button 
              className="pagination-btn"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="modal-overlay">
          <div className="modal-content edit-product-modal">
            <div className="modal-header">
              <h3 className="modal-title">Edit Product - {editingProduct.name}</h3>
              <button className="close-btn" onClick={closeEditModal}>×</button>
            </div>
            
            <div className="modal-form">
              {/* Basic Product Information */}
              <div className="form-section">
                <h4 className="section-title">Basic Information</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Product ID</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.product_id || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, product_id: e.target.value }))}
                      placeholder="e.g. #ABC123"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Product Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    className="form-textarea"
                    value={editFormData.description || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                    rows={4}
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      className="form-select"
                      value={editFormData.category || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Legacy Image URL (Optional)</label>
                    <input
                      type="url"
                      className="form-input"
                      value={editFormData.image_url || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                    />
                    <small className="form-hint">This field is for backward compatibility. Use the image management section below for new images.</small>
                  </div>
                </div>

                {/* Image Management Section */}
                <div className="form-section">
                  <h4 className="section-title">Product Images</h4>
                  <p className="section-subtitle">Add new images or manage existing ones. You can upload up to 10 images total.</p>
                  
                  {/* Existing Images */}
                  {existingImages.length > 0 && (
                    <div className="existing-images-section">
                      <h5>Current Images</h5>
                      <div className="images-grid">
                        {existingImages.map((image, index) => (
                          <div key={image.id || index} className="image-item existing">
                            <img 
                              src={`http://localhost:5000${image.url || image.image_url}`} 
                              alt={image.alt || `Product image ${index + 1}`}
                              className="image-preview"
                            />
                            <div className="image-controls">
                              <input
                                type="text"
                                value={image.alt || ''}
                                onChange={(e) => {
                                  const updatedImages = [...existingImages];
                                  updatedImages[index] = { ...image, alt: e.target.value };
                                  setExistingImages(updatedImages);
                                }}
                                placeholder="Alt text"
                                className="alt-input"
                              />
                              <div className="image-actions">
                                {index > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => moveExistingImage(index, index - 1)}
                                    className="move-btn"
                                    title="Move left"
                                  >
                                    ←
                                  </button>
                                )}
                                {index < existingImages.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => moveExistingImage(index, index + 1)}
                                    className="move-btn"
                                    title="Move right"
                                  >
                                    →
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeExistingImage(image.id, index)}
                                  className="remove-btn"
                                  title="Remove image"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Images Upload */}
                  <div className="new-images-section">
                    <div className="form-group">
                      <label>Add New Images</label>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleEditImageUpload}
                        className="file-input"
                      />
                      <small className="form-hint">Select multiple images to upload. Supported formats: JPG, PNG, WEBP, GIF</small>
                    </div>

                    {/* New Image Previews */}
                    {imagePreviews.length > 0 && (
                      <div className="new-images-previews">
                        <h5>New Images to Upload</h5>
                        <div className="images-grid">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="image-item new">
                              <img src={preview} alt={`New image ${index + 1}`} className="image-preview" />
                              <div className="image-controls">
                                <input
                                  type="text"
                                  value={imageAltTexts[index] || ''}
                                  onChange={(e) => updateImageAltText(index, e.target.value)}
                                  placeholder={`Alt text for image ${index + 1}`}
                                  className="alt-input"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeEditImage(index)}
                                  className="remove-btn"
                                  title="Remove image"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Other Details</label>
                  <textarea
                    className="form-textarea"
                    value={editFormData.other_details || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, other_details: e.target.value }))}
                    placeholder="Additional product information, specifications, etc."
                    rows={3}
                  />
                </div>

                {/* Size Chart Section */}
                <div className="form-group">
                  <label>Size Chart</label>
                  <p className="form-text">Manage the size measurement chart for this product.</p>
                  
                  {!showSizeChartBuilder && (
                    <div className="size-chart-actions">
                      {editSizeChart ? (
                        <div className="size-chart-info">
                          <div className="chart-info-box">
                            <p className="chart-summary">
                              Size Chart: <strong>{editSizeChart.rows} rows × {editSizeChart.columns} columns</strong>
                            </p>
                            <div className="chart-actions">
                              <button
                                type="button"
                                onClick={() => setShowSizeChartBuilder(true)}
                                className="btn btn-secondary btn-sm"
                              >
                                Edit Chart
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditSizeChart(null)}
                                className="btn btn-danger btn-sm"
                              >
                                Remove Chart
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowSizeChartBuilder(true)}
                          className="btn btn-primary"
                        >
                          + Create Size Chart
                        </button>
                      )}
                    </div>
                  )}
                  
                  {showSizeChartBuilder && (
                    <SizeChartBuilder
                      initialData={editSizeChart}
                      onSave={(chart) => {
                        setEditSizeChart(chart);
                        setShowSizeChartBuilder(false);
                      }}
                      onCancel={() => setShowSizeChartBuilder(false)}
                    />
                  )}
                </div>
              </div>

              {/* Size-specific Pricing & Inventory */}
              {editingProduct.sizes && editingProduct.sizes.length > 0 && (
                <div className="form-section">
                  <h4 className="section-title">Size-specific Pricing & Inventory</h4>
                  <p className="section-subtitle">Adjust price, market price, stock, and COD eligibility for each size. Changes are saved when you click "Save Changes".</p>
                  
                  <div className="sizes-grid">
                    {editingProduct.sizes.map((sizeData, index) => (
                      <div key={`${editingProduct.id}-${sizeData.size}-${sizeData.colour || 'Default'}`} className="size-input-group">
                        <div className="size-header">
                          <h5>Size: {sizeData.size} {sizeData.colour && sizeData.colour !== 'Default' ? `- Colour: ${sizeData.colour}` : ''}</h5>
                        </div>
                        <div className="size-pricing-grid">
                          <div className="pricing-field">
                            <label>Colour</label>
                            <input
                              type="text"
                              className="size-input"
                              value={colourEdits[`${editingProduct.id}-${sizeData.size}-${sizeData.colour || 'Default'}`] ?? (sizeData.colour || 'Default')}
                              onChange={(e) => {
                                const key = `${editingProduct.id}-${sizeData.size}-${sizeData.colour || 'Default'}`;
                                setColourEdits(prev => ({
                                  ...prev,
                                  [key]: e.target.value
                                }));
                                handleSizeColourChange(editingProduct.id, sizeData.size, sizeData.colour || 'Default', e.target.value);
                              }}
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Selling Price ($) *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="size-input"
                              defaultValue={sizeData.price || ''}
                              onBlur={(e) => handleSizePriceChange(editingProduct.id, sizeData.size, sizeData.colour || 'Default', parseFloat(e.target.value) || 0)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              required
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Market Price ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="size-input"
                              defaultValue={sizeData.market_price || ''}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                handleSizeMarketPriceChange(editingProduct.id, sizeData.size, value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              placeholder="Original market price"
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Actual Buy Price ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="size-input"
                              defaultValue={sizeData.actual_buy_price || ''}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                handleSizeActualBuyPriceChange(editingProduct.id, sizeData.size, value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              placeholder="Your cost for this product"
                            />
                          </div>
                          <div className="pricing-field">
                            <label>Stock Quantity</label>
                            <input
                              type="number"
                              min="0"
                              className="size-input"
                              value={sizeData.quantity}
                              onChange={(e) => handleSizeStockChange(editingProduct.id, sizeData.size, sizeData.colour || 'Default', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="pricing-field">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={sizeData.cod_eligible || false}
                                onChange={(e) => handleSizeCODEligibilityChange(editingProduct.id, sizeData.size, e.target.checked)}
                              />
                              <span className="checkmark"></span>
                              COD Eligible
                            </label>
                            <small className="form-hint">Cash on delivery allowed</small>
                          </div>
                        </div>
                        {sizeData.market_price && sizeData.price && sizeData.market_price > sizeData.price && (
                          <div className="discount-display">
                            {Math.round((1 - (sizeData.price / sizeData.market_price)) * 100)}% OFF
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Single Product without sizes */}
              {(!editingProduct.sizes || editingProduct.sizes.length === 0) && (
                <div className="form-section">
                  <h4 className="section-title">Inventory</h4>
                  
                  <div className="form-group">
                    <label>Stock Quantity</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={editFormData.stock_quantity || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              )}
              
              {/* Product Offer Management */}
              <div className="form-section">
                <h4 className="section-title">Product Offers</h4>
                <ProductOfferManager 
                  productId={editingProduct.id.toString()}
                  onUpdate={() => {
                    showSuccess('Product offers updated successfully');
                  }}
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={closeEditModal}>
                Cancel
              </button>
              <button className="modal-btn primary" onClick={handleEditSave}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateInventory;