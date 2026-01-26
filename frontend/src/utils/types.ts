// Type definitions for the application

export interface User {
  id: number;
  email: string;
  full_name: string;
  user_type: 'customer' | 'seller';
  phone?: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  market_price?: number;
  category: string;
  image_url?: string;
  images?: Array<any>; // JSONB array of images
  videos?: Array<any>; // JSONB array of videos
  stock_quantity: number;
  sizes?: Array<{
    size: string;
    quantity: number;
    colour?: string; // Colour variant for the size
    price?: number; // Optional price per size
    market_price?: number; // Original market price for discount calculation
    actual_buy_price?: number; // Seller's cost price
    cod_eligible?: boolean; // COD eligibility per size
  }>;
  seller_name?: string;
  seller_email?: string;
  created_at: string;
  updated_at?: string;
  is_active?: boolean;
  cod_eligible?: boolean; // Product-level COD eligibility
}

export interface CartItem {
  id: number;
  product_id: number;
  product: Product;
  quantity: number;
}

export interface ShippingAddress {
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
}

export interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number | string; // API can return either
  total: number | string; // API can return either
  selected_size?: string; // Size selected for the product
  selected_colour?: string; // Colour selected for the product
  image_url?: string; // Product image URL
  images?: Array<any>; // JSONB array of product images
  price_edited_by_seller?: boolean;
  quantity_edited_by_seller?: boolean;
  buy_price_edited_by_seller?: boolean;
  other_profit_loss?: number;
  other_profit_loss_edited_by_seller?: boolean;
  edited_at?: string;
}

export interface Order {
  id?: number;
  order_id?: number; // For seller API responses
  customer_id?: number;
  customer_name?: string;
  customer_email?: string;
  total_amount: number | string; // API can return either
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address: ShippingAddress;
  items: OrderItem[];
  created_at: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalProducts?: number;
  totalOrders?: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ProductsResponse {
  products: Product[];
  pagination: PaginationMeta;
}

export interface OrdersResponse {
  orders: Order[];
  pagination: PaginationMeta;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}