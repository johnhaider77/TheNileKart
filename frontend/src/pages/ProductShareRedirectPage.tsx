import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

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

    // Always open the website quick view in the browser (desktop and mobile).
    navigate(webTarget, { replace: true });
  }, [navigate, productId, searchParams]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <div>
        <h2 style={{ marginBottom: '8px' }}>Loading product...</h2>
        <p style={{ color: '#666' }}>Please wait a moment.</p>
      </div>
    </div>
  );
};

export default ProductShareRedirectPage;
