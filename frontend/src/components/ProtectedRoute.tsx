import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireCustomer?: boolean;
  requireSeller?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireCustomer = false, 
  requireSeller = false 
}) => {
  const { isAuthenticated, isCustomer, isSeller } = useAuth();
  const location = useLocation();

  // Helper to create login URL with context
  const createLoginUrl = (basePath: string = '/login') => {
    const currentPath = location.pathname;
    const from = currentPath.includes('checkout') ? 'checkout' : 
                currentPath.includes('cart') ? 'cart' : 'page';
    return `${basePath}?from=${from}&returnTo=${encodeURIComponent(currentPath)}`;
  };

  // Not authenticated - redirect to appropriate login
  if (!isAuthenticated) {
    if (requireSeller) {
      return <Navigate to="/seller/login" replace />;
    }
    return <Navigate to={createLoginUrl()} replace />;
  }

  // Customer route protection
  if (requireCustomer && !isCustomer) {
    if (isSeller) {
      return <Navigate to="/seller/dashboard" replace />;
    }
    return <Navigate to={createLoginUrl()} replace />;
  }

  // Seller route protection
  if (requireSeller && !isSeller) {
    if (isCustomer) {
      return <Navigate to="/products" replace />;
    }
    return <Navigate to="/seller/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;