import axios from 'axios';

// Use same logic as api.ts for getting base URL
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

interface PromoCodeData {
  code: string;
  description: string;
  start_date_time: string;
  expiry_date_time: string;
  eligible_users?: string[] | null;
  eligible_categories?: string[] | null;
  percent_off?: number;
  flat_off?: number;
  max_off?: number | null;
  min_purchase_value?: number;
  max_uses_per_user?: number | null;
}

class PromoCodeService {
  // Seller APIs
  async createPromoCode(data: PromoCodeData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/seller/promo-codes`, data, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getSellerPromoCodes(activeOnly: boolean = false) {
    try {
      const response = await axios.get(`${API_BASE_URL}/seller/promo-codes`, {
        params: { active_only: activeOnly },
        withCredentials: true,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updatePromoCode(id: number, data: Partial<PromoCodeData>) {
    try {
      const response = await axios.patch(`${API_BASE_URL}/seller/promo-codes/${id}`, data, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deletePromoCode(id: number) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/seller/promo-codes/${id}`, {
        withCredentials: true,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Customer APIs
  async validatePromoCode(code: string, cartItems: any[], cartTotal: number) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/promo-codes/validate`,
        {
          code,
          cartItems,
          cartTotal,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getAvailablePromoCodes() {
    try {
      const response = await axios.get(`${API_BASE_URL}/promo-codes/available`, {
        withCredentials: true,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new PromoCodeService();
