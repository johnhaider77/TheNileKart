import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../utils/types';
import { useAuth } from './AuthContext';

interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColour?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedSize?: string, selectedColour?: string) => void;
  removeFromCart: (productId: number, selectedSize?: string, selectedColour?: string) => void;
  updateQuantity: (productId: number, quantity: number, selectedSize?: string, selectedColour?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalAmount: () => number;
  getItemPrice: (item: CartItem) => number;
  mergeGuestCart: () => void;
  reloadCartFromLocalStorage: () => void;
  showNotification: boolean;
  hideNotification: () => void;
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
  const [showNotification, setShowNotification] = useState(false);

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
              item => item.product.id === guestItem.product.id &&
                       item.selectedSize === guestItem.selectedSize &&
                       (item.selectedColour || 'Default') === (guestItem.selectedColour || 'Default')
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

  const addToCart = (product: Product, quantity: number = 1, selectedSize?: string, selectedColour?: string) => {
    // Only use size if explicitly provided - don't default to 'One Size'
    // Backend will handle size defaulting during order creation
    const size = selectedSize || (product as any).selectedSize || undefined;
    const colour = selectedColour || (product as any).selectedColour || 'Default';
    
    // Get available quantity for the selected size+colour
    let availableStock = 0;
    if (product.sizes && Array.isArray(product.sizes)) {
      // If size is provided, find matching size+colour
      // If not provided, any available size is OK
      if (size) {
        const sizeData = product.sizes.find((s: any) => s.size === size && (s.colour || 'Default') === colour);
        availableStock = sizeData?.quantity || 0;
      } else {
        // No size specified - check if product has any available stock
        const availableSizeData = product.sizes.find((s: any) => s.quantity > 0);
        availableStock = availableSizeData?.quantity || 0;
      }
    } else {
      availableStock = product.stock_quantity || 0;
    }
    
    // Check if product/size/colour is in stock
    if (availableStock === 0) {
      alert(`Sorry, ${size || 'this item'}${colour !== 'Default' ? ` in ${colour}` : ''} is sold out!`);
      return;
    }

    setItems(currentItems => {
      const existingItem = currentItems.find(item => 
        item.product.id === product.id && 
        item.selectedSize === size &&
        (item.selectedColour || 'Default') === colour
      );
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        
        // Check if new quantity exceeds available stock for this size+colour
        if (newQuantity > availableStock) {
          const availableToAdd = availableStock - existingItem.quantity;
          if (availableToAdd > 0) {
            alert(`Only ${availableToAdd} more items available${colour !== 'Default' ? ` in ${colour}` : ''}. Added ${availableToAdd} to cart.`);
            // Show notification for successful add
            setShowNotification(true);
            return currentItems.map(item =>
              item.product.id === product.id && 
              item.selectedSize === size &&
              (item.selectedColour || 'Default') === colour
                ? { ...item, quantity: availableStock }
                : item
            );
          } else {
            alert(`You already have the maximum available quantity (${availableStock})${colour !== 'Default' ? ` for ${colour}` : ''} in your cart.`);
            return currentItems;
          }
        }
        
        // Show notification for successful add
        setShowNotification(true);
        return currentItems.map(item =>
          item.product.id === product.id && 
          item.selectedSize === size &&
          (item.selectedColour || 'Default') === colour
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        // Check if requested quantity exceeds available stock for this size+colour
        if (quantity > availableStock) {
          alert(`Only ${availableStock} items available${colour !== 'Default' ? ` in ${colour}` : ''}. Added ${availableStock} to cart.`);
          // Show notification for successful add
          setShowNotification(true);
          return [...currentItems, { product, quantity: availableStock, selectedSize: size, selectedColour: colour }];
        }
        
        // Show notification for successful add
        setShowNotification(true);
        return [...currentItems, { product, quantity, selectedSize: size, selectedColour: colour }];
      }
    });
  };

  const removeFromCart = (productId: number, selectedSize?: string, selectedColour?: string) => {
    setItems(currentItems => 
      currentItems.filter(item => 
        !(item.product.id === productId && 
          (selectedSize === undefined || item.selectedSize === selectedSize) &&
          (selectedColour === undefined || (item.selectedColour || 'Default') === selectedColour))
      )
    );
  };

  const updateQuantity = (productId: number, quantity: number, selectedSize?: string, selectedColour?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedSize, selectedColour);
      return;
    }

    setItems(currentItems =>
      currentItems.map(item => {
        if (item.product.id === productId && 
            (selectedSize === undefined || item.selectedSize === selectedSize) &&
            (selectedColour === undefined || (item.selectedColour || 'Default') === selectedColour)) {
          // Get available stock for this size+colour
          let availableStock = 0;
          if (item.product.sizes && Array.isArray(item.product.sizes)) {
            const sizeData = item.product.sizes.find((s: any) => 
              s.size === item.selectedSize && (s.colour || 'Default') === (item.selectedColour || 'Default')
            );
            availableStock = sizeData?.quantity || 0;
          } else {
            availableStock = item.product.stock_quantity || 0;
          }
          
          // Check if requested quantity exceeds available stock for this size+colour
          if (quantity > availableStock) {
            alert(`Only ${availableStock} items available${item.selectedColour && item.selectedColour !== 'Default' ? ` in ${item.selectedColour}` : ''}.`);
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

  // Force reload cart from localStorage (useful when returning from payment pages)
  const reloadCartFromLocalStorage = () => {
    try {
      const guestCart = localStorage.getItem('guestCart');
      if (guestCart) {
        const parsedCart = JSON.parse(guestCart);
        console.log('🔄 Cart reloaded from localStorage:', parsedCart.length, 'items');
        setItems(parsedCart);
      } else {
        console.warn('⚠️ No cart found in localStorage to reload');
      }
    } catch (error) {
      console.error('Error reloading cart from localStorage:', error);
    }
  };

  // Helper function to get the correct price for a cart item based on selected size and colour
  const getItemPrice = (item: CartItem): number => {
    // If product has sizes and a size is selected, use size-specific price
    if (item.product.sizes && Array.isArray(item.product.sizes) && item.selectedSize) {
      const sizeData = item.product.sizes.find((s: any) => 
        s.size === item.selectedSize && (s.colour || 'Default') === (item.selectedColour || 'Default')
      );
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
    reloadCartFromLocalStorage,
    showNotification,
    hideNotification: () => setShowNotification(false),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};