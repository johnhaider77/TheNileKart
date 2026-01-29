import React from 'react';
import '../styles/MaintenancePage.css';

interface MaintenancePageProps {
  portalType: 'customer' | 'seller';
  message?: string;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ 
  portalType, 
  message = 'The site is currently under maintenance. Please check back soon.'
}) => {
  return (
    <div className="maintenance-page">
      <div className="maintenance-container">
        <div className="maintenance-content">
          <div className="maintenance-image">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              {/* Construction/Maintenance Icon */}
              <g id="maintenance-icon">
                {/* Background circle */}
                <circle cx="100" cy="100" r="95" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="2"/>
                
                {/* Wrench */}
                <g transform="translate(60, 60)">
                  <rect x="5" y="30" width="40" height="8" fill="#f59e0b" transform="rotate(-45 25 34)"/>
                  <circle cx="50" cy="34" r="12" fill="#f59e0b"/>
                  <circle cx="50" cy="34" r="8" fill="white"/>
                </g>
                
                {/* Gears */}
                <g transform="translate(90, 60)">
                  {/* Gear 1 */}
                  <circle cx="15" cy="20" r="15" fill="none" stroke="#3b82f6" strokeWidth="3"/>
                  <g transform="translate(15, 20)">
                    <rect x="-2" y="-20" width="4" height="8" fill="#3b82f6"/>
                    <rect x="-2" y="12" width="4" height="8" fill="#3b82f6"/>
                    <rect x="-20" y="-2" width="8" height="4" fill="#3b82f6"/>
                    <rect x="12" y="-2" width="8" height="4" fill="#3b82f6"/>
                  </g>
                  {/* Gear 2 */}
                  <circle cx="35" cy="25" r="12" fill="none" stroke="#10b981" strokeWidth="3"/>
                  <g transform="translate(35, 25)">
                    <rect x="-2" y="-17" width="4" height="7" fill="#10b981"/>
                    <rect x="-2" y="10" width="4" height="7" fill="#10b981"/>
                    <rect x="-17" y="-2" width="7" height="4" fill="#10b981"/>
                    <rect x="10" y="-2" width="7" height="4" fill="#10b981"/>
                  </g>
                </g>
                
                {/* Warning sign */}
                <g transform="translate(65, 110)">
                  <polygon points="25,0 50,35 0,35" fill="#ef4444" stroke="#dc2626" strokeWidth="1"/>
                  <text x="25" y="25" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">!</text>
                </g>
              </g>
            </svg>
          </div>

          <h1 className="maintenance-title">
            {portalType === 'customer' ? '🛒' : '🏪'} Site Under Maintenance
          </h1>
          
          <p className="maintenance-message">
            {message}
          </p>

          <div className="maintenance-details">
            <p className="portal-type">
              {portalType === 'customer' ? 'Customer Portal' : 'Seller Portal'} is temporarily unavailable
            </p>
            <p className="check-back">
              We'll be back soon! Thank you for your patience.
            </p>
          </div>

          <div className="maintenance-footer">
            <p className="footer-text">
              If you have any questions, please contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
