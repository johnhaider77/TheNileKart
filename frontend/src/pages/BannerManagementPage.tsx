import React from 'react';
import BannerManagement from '../components/BannerManagement';

const BannerManagementPage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Banner & Offer Management</h1>
          <p className="page-subtitle">Create and manage promotional banners and offers</p>
        </div>
        
        <BannerManagement />
      </div>
    </div>
  );
};

export default BannerManagementPage;