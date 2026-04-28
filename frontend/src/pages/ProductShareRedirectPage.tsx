import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

const APP_STORE_URL = 'https://apps.apple.com/in/app/thenilekart/id6761305618';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.thenilekart&pcampaignid=web_share';

const isMobileDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const isIOSDevice = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

const ProductShareRedirectPage: React.FC = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!productId) {
      navigate('/products', { replace: true });
      return;
    }

    const offerCode = searchParams.get('offer');
    const webTarget = offerCode
      ? `/products/offers/${encodeURIComponent(offerCode)}?quickView=${encodeURIComponent(productId)}`
      : `/products?quickView=${encodeURIComponent(productId)}`;

    // Desktop/macOS: always open website quick view.
    if (!isMobileDevice()) {
      navigate(webTarget, { replace: true });
      return;
    }

    // Mobile: try opening app first, then fallback to app stores if app is not installed.
    const appDeepLink = `thenilekart://product/${encodeURIComponent(productId)}`;
    const fallbackStore = isIOSDevice() ? APP_STORE_URL : PLAY_STORE_URL;

    let pageHidden = false;
    const visibilityHandler = () => {
      if (document.hidden) {
        pageHidden = true;
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);

    const fallbackTimer = window.setTimeout(() => {
      if (!pageHidden) {
        window.location.href = fallbackStore;
      }
    }, 1600);

    window.location.href = appDeepLink;

    return () => {
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.clearTimeout(fallbackTimer);
    };
  }, [navigate, productId, searchParams]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <div>
        <h2 style={{ marginBottom: '8px' }}>Opening product...</h2>
        <p style={{ color: '#666' }}>If nothing happens, please open TheNileKart app manually.</p>
      </div>
    </div>
  );
};

export default ProductShareRedirectPage;
