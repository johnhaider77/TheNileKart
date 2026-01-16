import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../utils/types';

interface AuthContextType {
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isCustomer: boolean;
  isSeller: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token and user data on app load
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    // Cart merge will be handled by CartContext useEffect
  };

  const logout = async () => {
    try {
      // Optional: Call backend logout endpoint
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Make a logout request to the backend (optional)
          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://192.168.1.137:5000/api'}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          // Handle expired token silently - don't throw error for 401
          if (response.status === 401) {
            // Token expired, continue with local logout silently
            console.log('Token expired during logout, continuing with local cleanup');
          }
        } catch (error) {
          // Backend logout failed, continuing with local logout
          console.log('Backend logout failed, continuing with local cleanup');
        }
      }
      
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('guestCart'); // Clear guest cart on logout
      setUser(null);
      
      // Force a page reload to ensure complete cleanup
      window.location.reload();
      
    } catch (error) {
      // Fallback: clear localStorage anyway
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      
      // Force page reload as fallback
      window.location.href = '/login';
    }
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isCustomer: user?.user_type === 'customer',
    isSeller: user?.user_type === 'seller',
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};