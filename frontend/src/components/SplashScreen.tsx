import React, { useState, useEffect } from 'react';
import '../styles/SplashScreen.css';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number; // Duration to show splash in ms (default: 1000)
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, duration = 1000 }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Show splash for specified duration, then start zoom-out animation
    const showTimer = setTimeout(() => {
      setIsAnimating(true);
    }, duration);

    // Hide splash after animation completes
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration + 800); // 800ms for animation

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`splash-screen ${isAnimating ? 'zoom-out' : ''}`}
    >
      {/* Blurred background container */}
      <div className={`splash-background ${isAnimating ? 'fade-out' : ''}`} />
      
      {/* Logo container with shadow effect */}
      <div className={`splash-logo-container ${isAnimating ? 'hide' : ''}`}>
        <img
          src="/TheNileKart.jpeg"
          alt="TheNileKart Splash"
          className={`splash-image ${isAnimating ? 'zoom-out-image' : ''}`}
        />
        
        {/* Glow effect behind logo */}
        <div className="splash-glow" />
      </div>
    </div>
  );
};

export default SplashScreen;
