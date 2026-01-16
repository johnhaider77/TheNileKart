import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Import pages - using modern components
import HomePage from './pages/HomePage';
import ModernLogin from './pages/ModernLogin';
import ModernProductListing from './pages/ModernProductListing';
import CheckoutPage from './pages/CheckoutPage';
import ThankYouPage from './pages/ThankYouPage';
import AccountPage from './pages/AccountPage';
import ForgotPassword from './pages/ForgotPassword';
import SellerLogin from './pages/SellerLogin';
import SellerDashboard from './pages/SellerDashboard';
import CreateProduct from './pages/CreateProduct';
import UpdateInventory from './pages/UpdateInventory';
import OrdersQueue from './pages/OrdersQueue';
import BannerManagementPage from './pages/BannerManagementPage';
import OfferProductsPage from './pages/OfferProductsPage';
import SearchPage from './pages/SearchPage';

// Import components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Import styles
import './styles/global.css';
import './App.css';

function AppRoutes() {
  const { isAuthenticated, isSeller, isCustomer } = useAuth();

  return (
    <div className="App">
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Home page - Only for customers and guests. Sellers redirected to dashboard */}
          <Route 
            path="/" 
            element={
              isSeller ? <Navigate to="/seller/dashboard" replace /> : <HomePage />
            }
          />
          
          {/* Products route - Only for customers and guests */}
          <Route 
            path="/products"
            element={
              isSeller ? <Navigate to="/seller/dashboard" replace /> : <ModernProductListing />
            }
          />
          
          {/* Search route - Only for customers and guests */}
          <Route 
            path="/search"
            element={
              isSeller ? <Navigate to="/seller/dashboard" replace /> : <SearchPage />
            }
          />
          
          {/* Offer products route - Only for customers and guests */}
          <Route 
            path="/products/offers/:offerCode"
            element={
              isSeller ? <Navigate to="/seller/dashboard" replace /> : <OfferProductsPage />
            }
          />
          
          {/* Customer Login routes - Redirect sellers if they try to access */}
          <Route 
            path="/login" 
            element={
              isSeller ? <Navigate to="/seller/dashboard" replace /> : <ModernLogin />
            }
          />
          
          <Route 
            path="/forgot-password" 
            element={
              isSeller ? <Navigate to="/seller/dashboard" replace /> : <ForgotPassword />
            }
          />
          
          {/* Customer-only routes */}
          <Route
            path="/checkout"
            element={
              isSeller ? (
                <Navigate to="/seller/dashboard" replace />
              ) : (
                <ProtectedRoute requireCustomer>
                  <CheckoutPage />
                </ProtectedRoute>
              )
            }
          />

          {/* Cart route - redirects to checkout for customers only */}
          <Route 
            path="/cart"
            element={
              isSeller ? <Navigate to="/seller/dashboard" replace /> : <Navigate to="/checkout" replace />
            }
          />

          <Route 
            path="/account"
            element={
              isSeller ? (
                <Navigate to="/seller/dashboard" replace />
              ) : (
                <ProtectedRoute requireCustomer>
                  <AccountPage />
                </ProtectedRoute>
              )
            }
          />
          
          <Route
            path="/thank-you"
            element={
              isSeller ? (
                <Navigate to="/seller/dashboard" replace />
              ) : (
                <ProtectedRoute requireCustomer>
                  <ThankYouPage />
                </ProtectedRoute>
              )
            }
          />

          {/* Seller routes - Block customers from accessing */}
          <Route 
            path="/seller/login" 
            element={
              isAuthenticated && isSeller 
                ? <Navigate to="/seller/dashboard" />
                : isAuthenticated && isCustomer
                ? <Navigate to="/" />
                : <SellerLogin />
            } 
          />
          
          <Route
            path="/seller/dashboard"
            element={
              isCustomer ? (
                <Navigate to="/" replace />
              ) : (
                <ProtectedRoute requireSeller>
                  <SellerDashboard />
                </ProtectedRoute>
              )
            }
          />
          
          <Route
            path="/seller/create-product"
            element={
              isCustomer ? (
                <Navigate to="/" replace />
              ) : (
                <ProtectedRoute requireSeller>
                  <CreateProduct />
                </ProtectedRoute>
              )
            }
          />
          
          <Route
            path="/seller/inventory"
            element={
              isCustomer ? (
                <Navigate to="/" replace />
              ) : (
                <ProtectedRoute requireSeller>
                  <UpdateInventory />
                </ProtectedRoute>
              )
            }
          />
          
          <Route
            path="/seller/banners"
            element={
              isCustomer ? (
                <Navigate to="/" replace />
              ) : (
                <ProtectedRoute requireSeller>
                  <BannerManagementPage />
                </ProtectedRoute>
              )
            }
          />
          
          <Route
            path="/seller/orders"
            element={
              isCustomer ? (
                <Navigate to="/" replace />
              ) : (
                <ProtectedRoute requireSeller>
                  <OrdersQueue />
                </ProtectedRoute>
              )
            }
          />

          {/* Catch-all for any other seller routes - redirect customers */}
          <Route 
            path="/seller/*"
            element={
              isCustomer ? <Navigate to="/" replace /> : <Navigate to="/seller/login" replace />
            }
          />

          {/* 404 route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <Router>
            <AppRoutes />
          </Router>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
