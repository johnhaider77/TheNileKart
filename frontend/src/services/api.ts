import axios from 'axios';

// Use environment variable for API URL, fallback to localhost
const getApiBaseUrl = () => {
  // In production, REACT_APP_API_URL is set to /api (relative path)
  // This means API calls will go to the same host as the frontend
  if (process.env.REACT_APP_API_URL === '/api') {
    // Relative path - will use same host as frontend
    // In development: http://localhost:3000/api → proxied to http://localhost:5000/api
    // In production: https://www.thenilekart.com/api → backend at same domain
    return '/api';
  }
  
  if (process.env.REACT_APP_API_URL) {
    // Absolute URL provided
    return process.env.REACT_APP_API_URL;
  }
  
  // Fallback: try to use the same host as the frontend (with HTTPS on production)
  if (window.location.hostname !== 'localhost') {
    const protocol = window.location.protocol; // http: or https:
    return `${protocol}//${window.location.hostname}/api`;
  }
  
  // Default to localhost for development
  return 'http://localhost:5000/api';
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
    api.post('/auth/login', { email, password }),
  
  register: (userData: {
    email: string;
    password: string;
    full_name: string;
    user_type: 'customer' | 'seller';
    phone?: string;
  }) => api.post('/auth/register', userData),
  
  getProfile: () => api.get('/auth/profile'),
  
  updateProfile: (userData: { full_name?: string; phone?: string }) =>
    api.put('/auth/profile', userData),

  // Address management
  getAddresses: () => api.get('/auth/addresses'),
  
  saveAddress: (addressData: {
    type: 'shipping' | 'billing';
    full_name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country?: string;
    phone?: string;
    is_default?: boolean;
  }) => api.post('/auth/addresses', addressData),
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
  }) => api.get('/products', { params }),
  
  getProduct: (id: string) => api.get(`/products/${id}`),
  
  getCategories: () => api.get('/products/categories/list'),
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
    payment_method?: string;
    promo_code_id?: number;
    promo_discount_amount?: number;
  }) => api.post('/orders', orderData),
  
  calculateCOD: (items: any[]) => api.post('/orders/calculate-cod', { items }),
  
  calculateShipping: (items: any[]) => api.post('/orders/calculate-shipping', { items }),
  
  getOrders: () => api.get('/orders'),
  
  getOrder: (id: string) => api.get(`/orders/${id}`),
};

// Seller API calls
export const sellerAPI = {
  // Products
  createProduct: (formData: FormData) =>
    api.post('/seller/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  getSellerProducts: (params?: { page?: number; limit?: number }) =>
    api.get('/seller/products', { params }),

  searchProducts: (params?: {
    page?: number;
    limit?: number;
    product_id?: string;
    name?: string;
    category?: string;
    is_active?: boolean;
    min_stock?: number;
    max_stock?: number;
  }) => api.get('/seller/products/search', { params }),
  
  updateProduct: (id: string, formData: FormData) =>
    api.put(`/seller/products/${id}`, formData, {
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
  }) => api.put(`/seller/products/${id}`, updates),
  
  toggleProduct: (id: string) =>
    api.patch(`/seller/products/${id}/toggle`),

  bulkUpdateProducts: (productIds: string[], updates: {
    stock_quantity?: number;
    price?: number;
    category?: string;
    is_active?: boolean;
  }) => api.patch('/seller/products/bulk', { productIds, updates }),
  
  // Size Management
  updateProductSizeQuantity: (productId: string, size: string, colour: string, quantity: number) => 
    api.patch(`/seller/products/${productId}/sizes/${encodeURIComponent(size)}/${encodeURIComponent(colour)}`, { quantity }),
  
  updateProductSizePrice: (productId: string, size: string, colour: string, price: number) => {
    console.log(`🔄 API Call: updateProductSizePrice(${productId}, ${size}, ${colour}, ${price})`);
    const url = `/seller/products/${productId}/sizes/${encodeURIComponent(size)}/${encodeURIComponent(colour)}`;
    console.log(`📡 Calling: PATCH ${url}`);
    return api.patch(url, { price });
  },
  
  
  updateProductSizeMarketPrice: (productId: string, size: string, colour: string, market_price: number) => {
    console.log(`🔄 API Call: updateProductSizeMarketPrice(${productId}, ${size}, ${colour}, ${market_price})`);
    const url = `/seller/products/${productId}/sizes/${encodeURIComponent(size)}/${encodeURIComponent(colour)}`;
    console.log(`📡 Calling: PATCH ${url}`);
    return api.patch(url, { market_price });
  },
  
  updateProductSizeActualBuyPrice: (productId: string, size: string, colour: string, actual_buy_price: number) => {
    console.log(`🔄 API Call: updateProductSizeActualBuyPrice(${productId}, ${size}, ${colour}, ${actual_buy_price})`);
    const url = `/seller/products/${productId}/sizes/${encodeURIComponent(size)}/${encodeURIComponent(colour)}`;
    console.log(`📡 Calling: PATCH ${url}`);
    return api.patch(url, { actual_buy_price });
  },

  updateProductSizeCODEligibility: (productId: string, size: string, colour: string, cod_eligible: boolean) => {
    console.log(`🔄 API Call: updateProductSizeCODEligibility(${productId}, ${size}, ${colour}, ${cod_eligible})`);
    const url = `/seller/products/${productId}/sizes/${encodeURIComponent(size)}/${encodeURIComponent(colour)}/cod-eligibility`;
    console.log(`📡 Calling: PUT ${url}`);
    return api.put(url, { cod_eligible });
  },

  updateProductSizeColour: (productId: string, size: string, oldColour: string, newColour: string) => {
    console.log(`🔄 API Call: updateProductSizeColour(${productId}, ${size}, ${oldColour}, ${newColour})`);
    const url = `/seller/products/${productId}/sizes/${encodeURIComponent(size)}/${encodeURIComponent(oldColour)}/colour`;
    console.log(`📡 Calling: PATCH ${url}`);
    return api.patch(url, { colour: newColour });
  },
  
  // Orders
  getSellerOrders: (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) => api.get('/seller/orders', { params }),
  
  updateOrderStatus: (id: string, status: string) =>
    api.patch(`/seller/orders/${id}/status`, { status }),

  updateOrderDetails: (updateData: {
    order_id: number;
    product_price?: number;
    actual_buy_price?: number;
    quantity?: number;
    other_profit_loss?: number;
    edited_by_seller: boolean;
    edited_at: string;
  }) => {
    return api.patch(`/seller/orders/${updateData.order_id}/details`, updateData);
  },

  // Offers
  getOffers: () => api.get('/offers'),
  getSellerOffers: () => api.get('/offers/seller'),
  createOffer: (offerData: {
    offer_code: string;
    name: string;
    description: string;
  }) => api.post('/offers', offerData),
  updateOffer: (offerCode: string, offerData: {
    name: string;
    description: string;
    is_active: boolean;
  }) => api.put(`/offers/${offerCode}`, offerData),
  deleteOffer: (offerCode: string) => api.delete(`/offers/${offerCode}`),

  // Banners
  getBanners: () => api.get('/banners'),
  getSellerBanners: () => api.get('/banners/seller'),
  createBanner: (bannerData: FormData) => api.post('/banners', bannerData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateBanner: (id: string, bannerData: FormData) => api.put(`/banners/${id}`, bannerData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteBanner: (id: string) => api.delete(`/banners/${id}`),

  // Offer Products
  getOfferProducts: (offerCode: string) => api.get(`/offers/${offerCode}/products`),

  // Product Offers Management
  getProductOffers: (productId: string) => api.get(`/seller/products/${productId}/offers`),
  updateProductOffers: (productId: string, offers: string[]) => 
    api.put(`/seller/products/${productId}/offers`, { offers }),
};

export default api;