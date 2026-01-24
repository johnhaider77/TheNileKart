import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

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
      const response = await axios.post(`${API_BASE_URL}/api/seller/promo-codes`, data, {
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
      const response = await axios.get(`${API_BASE_URL}/api/seller/promo-codes`, {
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
      const response = await axios.patch(`${API_BASE_URL}/api/seller/promo-codes/${id}`, data, {
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
      const response = await axios.delete(`${API_BASE_URL}/api/seller/promo-codes/${id}`, {
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
        `${API_BASE_URL}/api/promo-codes/validate`,
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
      const response = await axios.get(`${API_BASE_URL}/api/promo-codes/available`, {
        withCredentials: true,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new PromoCodeService();
