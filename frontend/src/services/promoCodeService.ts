import api from './api';

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
      const response = await api.post('/seller/promo-codes', data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getSellerPromoCodes(activeOnly: boolean = false) {
    try {
      const response = await api.get('/seller/promo-codes', {
        params: { active_only: activeOnly },
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updatePromoCode(id: number, data: Partial<PromoCodeData>) {
    try {
      const response = await api.patch(`/seller/promo-codes/${id}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deletePromoCode(id: number) {
    try {
      const response = await api.delete(`/seller/promo-codes/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Customer APIs
  async validatePromoCode(code: string, cartItems: any[], cartTotal: number) {
    try {
      const response = await api.post('/promo-codes/validate', {
        code,
        cartItems,
        cartTotal,
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getAvailablePromoCodes() {
    try {
      const response = await api.get('/promo-codes/available');
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new PromoCodeService();
