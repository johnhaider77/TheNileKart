import React, { useState, useEffect } from 'react';
import '../styles/SplashScreen.css';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number; // Duration to show splash in ms (default: 2000)
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, duration = 2000 }) => {
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
    }, duration + 600); // 600ms for animation

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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        zIndex: 9999,
      }}
    >
      <img
        src="/TheNileKart.jpeg"
        alt="TheNileKart Splash"
        className={`splash-image ${isAnimating ? 'zoom-out-image' : ''}`}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

export default SplashScreen;
