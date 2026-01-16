import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../utils/types';
import { useAuth } from './AuthContext';

interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedSize?: string) => void;
  removeFromCart: (productId: number, selectedSize?: string) => void;
  updateQuantity: (productId: number, quantity: number, selectedSize?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalAmount: () => number;
  getItemPrice: (item: CartItem) => number;
  mergeGuestCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const { isAuthenticated, user } = useAuth();
  const [guestCartLoaded, setGuestCartLoaded] = useState(false);

  // Guest cart management functions
  const loadGuestCart = () => {
    try {
      const guestCart = localStorage.getItem('guestCart');
      if (guestCart) {
        const parsedCart = JSON.parse(guestCart);
        setItems(parsedCart);
      }
    } catch (error) {
      console.error('Error loading guest cart:', error);
      setItems([]);
    }
  };

  const saveGuestCart = () => {
    try {
      localStorage.setItem('guestCart', JSON.stringify(items));
    } catch (error) {
      console.error('Error saving guest cart:', error);
    }
  };

  const clearGuestCart = () => {
    localStorage.removeItem('guestCart');
  };

  const mergeGuestCart = () => {
    try {
      const guestCart = localStorage.getItem('guestCart');
      if (guestCart) {
        const guestItems: CartItem[] = JSON.parse(guestCart);
        
        // Merge guest cart with current user cart
        setItems(currentItems => {
          const mergedItems = [...currentItems];
          
          guestItems.forEach(guestItem => {
            const existingItemIndex = mergedItems.findIndex(
              item => item.product.id === guestItem.product.id
            );
            
            if (existingItemIndex >= 0) {
              // Item exists, add quantities
              mergedItems[existingItemIndex].quantity += guestItem.quantity;
            } else {
              // New item, add to cart
              mergedItems.push(guestItem);
            }
          });
          
          return mergedItems;
        });
        
        // Clear guest cart after successful merge
        clearGuestCart();
      }
    } catch (error) {
      console.error('Error merging guest cart:', error);
    }
  };

  // Load cart based on authentication status
  useEffect(() => {
    if (isAuthenticated && user && !guestCartLoaded) {
      // User just logged in - merge guest cart
      mergeGuestCart();
      setGuestCartLoaded(true);
    } else if (!isAuthenticated && !guestCartLoaded) {
      // Load guest cart from localStorage
      loadGuestCart();
      setGuestCartLoaded(true);
    }
  }, [isAuthenticated, user, guestCartLoaded]);

  // Save guest cart to localStorage whenever items change and user is not authenticated
  useEffect(() => {
    if (!isAuthenticated && guestCartLoaded && items.length >= 0) {
      saveGuestCart();
    }
  }, [items, isAuthenticated, guestCartLoaded]);

  const addToCart = (product: Product, quantity: number = 1, selectedSize?: string) => {
    const size = selectedSize || (product as any).selectedSize || 'One Size';
    
    // Get available quantity for the selected size
    let availableStock = 0;
    if (product.sizes && Array.isArray(product.sizes)) {
      const sizeData = product.sizes.find((s: any) => s.size === size);
      availableStock = sizeData?.quantity || 0;
    } else {
      availableStock = product.stock_quantity || 0;
    }
    
    // Check if product/size is in stock
    if (availableStock === 0) {
      alert(`Sorry, size ${size} is sold out!`);
      return;
    }

    setItems(currentItems => {
      const existingItem = currentItems.find(item => 
        item.product.id === product.id && item.selectedSize === size
      );
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        
        // Check if new quantity exceeds available stock for this size
        if (newQuantity > availableStock) {
          const availableToAdd = availableStock - existingItem.quantity;
          if (availableToAdd > 0) {
            alert(`Only ${availableToAdd} more items available in size ${size}. Added ${availableToAdd} to cart.`);
            return currentItems.map(item =>
              item.product.id === product.id && item.selectedSize === size
                ? { ...item, quantity: availableStock }
                : item
            );
          } else {
            alert(`You already have the maximum available quantity (${availableStock}) for size ${size} in your cart.`);
            return currentItems;
          }
        }
        
        return currentItems.map(item =>
          item.product.id === product.id && item.selectedSize === size
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        // Check if requested quantity exceeds available stock for this size
        if (quantity > availableStock) {
          alert(`Only ${availableStock} items available in size ${size}. Added ${availableStock} to cart.`);
          return [...currentItems, { product, quantity: availableStock, selectedSize: size }];
        }
        
        return [...currentItems, { product, quantity, selectedSize: size }];
      }
    });
  };

  const removeFromCart = (productId: number, selectedSize?: string) => {
    setItems(currentItems => 
      currentItems.filter(item => 
        !(item.product.id === productId && 
          (selectedSize === undefined || item.selectedSize === selectedSize))
      )
    );
  };

  const updateQuantity = (productId: number, quantity: number, selectedSize?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedSize);
      return;
    }

    setItems(currentItems =>
      currentItems.map(item => {
        if (item.product.id === productId && 
            (selectedSize === undefined || item.selectedSize === selectedSize)) {
          // Get available stock for this size
          let availableStock = 0;
          if (item.product.sizes && Array.isArray(item.product.sizes)) {
            const sizeData = item.product.sizes.find((s: any) => s.size === item.selectedSize);
            availableStock = sizeData?.quantity || 0;
          } else {
            availableStock = item.product.stock_quantity || 0;
          }
          
          // Check if requested quantity exceeds available stock for this size
          if (quantity > availableStock) {
            alert(`Only ${availableStock} items available${item.selectedSize ? ` in size ${item.selectedSize}` : ''}.`);
            return { ...item, quantity: availableStock };
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    if (!isAuthenticated) {
      clearGuestCart();
    }
  };

  // Helper function to get the correct price for a cart item based on selected size
  const getItemPrice = (item: CartItem): number => {
    // If product has sizes and a size is selected, use size-specific price
    if (item.product.sizes && Array.isArray(item.product.sizes) && item.selectedSize) {
      const sizeData = item.product.sizes.find((s: any) => s.size === item.selectedSize);
      if (sizeData && sizeData.price !== undefined) {
        return Number(sizeData.price);
      }
    }
    // Fallback to base product price
    return Number(item.product.price);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalAmount = () => {
    return items.reduce((total, item) => total + (getItemPrice(item) * item.quantity), 0);
  };

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalAmount,
    getItemPrice,
    mergeGuestCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};