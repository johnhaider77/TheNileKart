import axios from 'axios';

// Use environment variable for API URL, fallback to localhost
const getApiBaseUrl = () => {
  // Use environment variable if available
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace('/api', '');
  }
  
  // Fallback: try to use the same host as the frontend
  if (window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:5000`;
  }
  
  // Default to localhost for development
  return 'http://localhost:5000';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000, // Reduce to 5 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - handle immediately and silently
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('guestCart');
      
      // Only redirect to login if not on public pages
      const currentPath = window.location.pathname;
      const publicPaths = ['/', '/products', '/login', '/forgot-password'];
      const isOfferPath = currentPath.startsWith('/products/offers/');
      
      if (!publicPaths.includes(currentPath) && !isOfferPath) {
        // Create redirect URL with context about where user came from
        const from = currentPath.includes('checkout') ? 'checkout' : 
                    currentPath.includes('cart') ? 'cart' : 'page';
        const redirectUrl = `/login?from=${from}&returnTo=${encodeURIComponent(currentPath)}`;
        
        // Redirect immediately without any delay
        window.location.href = redirectUrl;
        
        // Return a rejected promise that will prevent further error handling
        return new Promise(() => {}); // Never resolves, prevents error propagation
      }
      
      // For public pages, just reject the error without redirecting
      return Promise.reject(error);
    }
    
    if (error.response?.status === 403) {
      // Authorization error - user doesn't have required permissions
      // Check if user is trying to access customer-only features without customer account
      const errorMessage = error.response?.data?.message || '';
      if (errorMessage.includes('Customer access required')) {
        // User is logged in but not as a customer
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('guestCart');
        
        // Only redirect if not on public pages
        const currentPath = window.location.pathname;
        const publicPaths = ['/', '/products', '/login', '/forgot-password'];
        const isOfferPath = currentPath.startsWith('/products/offers/');
        
        if (!publicPaths.includes(currentPath) && !isOfferPath) {
          // Create redirect URL with context about where user came from
          const from = currentPath.includes('checkout') ? 'checkout' : 
                      currentPath.includes('cart') ? 'cart' : 'page';
          const redirectUrl = `/login?from=${from}&returnTo=${encodeURIComponent(currentPath)}`;
          
          window.location.href = redirectUrl;
          return new Promise(() => {}); // Never resolves, prevents error propagation
        }
        
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  
  register: (userData: {
    email: string;
    password: string;
    full_name: string;
    user_type: 'customer' | 'seller';
    phone?: string;
  }) => api.post('/api/auth/register', userData),
  
  getProfile: () => api.get('/api/auth/profile'),
  
  updateProfile: (userData: { full_name?: string; phone?: string }) =>
    api.put('/api/auth/profile', userData),
};

// Products API calls
export const productsAPI = {
  getProducts: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
  }) => api.get('/api/products', { params }),
  
  getProduct: (id: string) => api.get(`/api/products/${id}`),
  
  getCategories: () => api.get('/api/products/categories/list'),
};

// Orders API calls
export const ordersAPI = {
  createOrder: (orderData: {
    items: Array<{ product_id: number; quantity: number; size?: string }>;
    shipping_address: {
      full_name: string;
      address_line1: string;
      address_line2?: string;
      city: string;
      state: string;
      postal_code: string;
      phone: string;
    };
  }) => api.post('/api/orders', orderData),
  
  calculateCOD: (items: any[]) => api.post('/api/orders/calculate-cod', { items }),
  
  getOrders: () => api.get('/api/orders'),
  
  getOrder: (id: string) => api.get(`/api/orders/${id}`),
};

// Seller API calls
export const sellerAPI = {
  // Products
  createProduct: (formData: FormData) =>
    api.post('/api/seller/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  getSellerProducts: (params?: { page?: number; limit?: number }) =>
    api.get('/api/seller/products', { params }),

  searchProducts: (params?: {
    page?: number;
    limit?: number;
    product_id?: string;
    name?: string;
    category?: string;
    is_active?: boolean;
    min_stock?: number;
    max_stock?: number;
  }) => api.get('/api/seller/products/search', { params }),
  
  updateProduct: (id: string, formData: FormData) =>
    api.put(`/api/seller/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateProductFields: (id: string, updates: {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    stock_quantity?: number;
    product_id?: string;
    actual_buy_price?: number;
    other_details?: string;
    image_url?: string;
  }) => api.put(`/api/seller/products/${id}`, updates),
  
  toggleProduct: (id: string) =>
    api.patch(`/api/seller/products/${id}/toggle`),

  bulkUpdateProducts: (productIds: string[], updates: {
    stock_quantity?: number;
    price?: number;
    category?: string;
    is_active?: boolean;
  }) => api.patch('/api/seller/products/bulk', { productIds, updates }),
  
  // Size Management
  updateProductSizeQuantity: (productId: string, size: string, quantity: number) => 
    api.patch(`/api/seller/products/${productId}/sizes/${encodeURIComponent(size)}`, { quantity }),
  
  updateProductSizePrice: (productId: string, size: string, price: number) => {
    console.log(`🔄 API Call: updateProductSizePrice(${productId}, ${size}, ${price})`);
    const url = `/api/seller/products/${productId}/sizes/${encodeURIComponent(size)}`;
    console.log(`📡 Calling: PATCH ${url}`);
    return api.patch(url, { price });
  },
  
  updateProductSizeMarketPrice: (productId: string, size: string, market_price: number) => {
    console.log(`🔄 API Call: updateProductSizeMarketPrice(${productId}, ${size}, ${market_price})`);
    const url = `/api/seller/products/${productId}/sizes/${encodeURIComponent(size)}`;
    console.log(`📡 Calling: PATCH ${url}`);
    return api.patch(url, { market_price });
  },
  
  updateProductSizeActualBuyPrice: (productId: string, size: string, actual_buy_price: number) => {
    console.log(`🔄 API Call: updateProductSizeActualBuyPrice(${productId}, ${size}, ${actual_buy_price})`);
    const url = `/api/seller/products/${productId}/sizes/${encodeURIComponent(size)}`;
    console.log(`📡 Calling: PATCH ${url}`);
    return api.patch(url, { actual_buy_price });
  },

  updateProductSizeCODEligibility: (productId: string, size: string, cod_eligible: boolean) => {
    console.log(`🔄 API Call: updateProductSizeCODEligibility(${productId}, ${size}, ${cod_eligible})`);
    const url = `/api/seller/products/${productId}/sizes/${encodeURIComponent(size)}/cod-eligibility`;
    console.log(`📡 Calling: PUT ${url}`);
    return api.put(url, { cod_eligible });
  },
  
  // Orders
  getSellerOrders: (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) => api.get('/api/seller/orders', { params }),
  
  updateOrderStatus: (id: string, status: string) =>
    api.patch(`/api/seller/orders/${id}/status`, { status }),

  updateOrderDetails: (updateData: {
    order_id: number;
    product_price?: number;
    actual_buy_price?: number;
    quantity?: number;
    other_profit_loss?: number;
    edited_by_seller: boolean;
    edited_at: string;
  }) => {
    return api.patch(`/api/seller/orders/${updateData.order_id}/details`, updateData);
  },

  // Offers
  getOffers: () => api.get('/api/offers'),
  getSellerOffers: () => api.get('/api/offers/seller'),
  createOffer: (offerData: {
    offer_code: string;
    name: string;
    description: string;
  }) => api.post('/api/offers', offerData),
  updateOffer: (offerCode: string, offerData: {
    name: string;
    description: string;
    is_active: boolean;
  }) => api.put(`/api/offers/${offerCode}`, offerData),
  deleteOffer: (offerCode: string) => api.delete(`/api/offers/${offerCode}`),

  // Banners
  getBanners: () => api.get('/api/banners'),
  getSellerBanners: () => api.get('/api/banners/seller'),
  createBanner: (bannerData: FormData) => api.post('/api/banners', bannerData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateBanner: (id: string, bannerData: FormData) => api.put(`/api/banners/${id}`, bannerData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteBanner: (id: string) => api.delete(`/api/banners/${id}`),

  // Offer Products
  getOfferProducts: (offerCode: string) => api.get(`/api/offers/${offerCode}/products`),

  // Product Offers Management
  getProductOffers: (productId: string) => api.get(`/api/seller/products/${productId}/offers`),
  updateProductOffers: (productId: string, offers: string[]) => 
    api.post(`/api/seller/products/${productId}/offers`, { offers }),
};

export default api;