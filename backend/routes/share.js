const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Helper: convert S3 image URL (same logic as products.js)
function getImageUrl(imageUrl) {
  if (!imageUrl) return 'https://www.thenilekart.com/logo192.png';
  // Ensure it's a string
  const url = typeof imageUrl === 'string' ? imageUrl : String(imageUrl);
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative path → S3
  const S3_BASE = process.env.S3_BASE_URL || 'https://thenilekart-images-prod.s3.me-central-1.amazonaws.com';
  return `${S3_BASE}/${url.replace(/^\/+/, '')}`;
}

// Social media crawlers that need server-side OG tags
const CRAWLER_RE = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|applebot|googlebot|bingbot|yandexbot|duckduckbot|baiduspider|ia_archiver|semrushbot|ahrefsbot|mj12bot/i;

function isCrawler(ua) {
  return CRAWLER_RE.test(ua || '');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// GET /product/:productId
router.get('/:productId', async (req, res) => {
  const { productId } = req.params;
  const ua = req.headers['user-agent'] || '';

  // Build the redirect target (human quick-view URL)
  const offerCode = req.query.offer;
  const quickViewTarget = offerCode
    ? `/products/offers/${encodeURIComponent(offerCode)}?quickView=${encodeURIComponent(productId)}`
    : `/products?quickView=${encodeURIComponent(productId)}`;

  try {
    const result = await db.query(
      `SELECT p.id, p.name, p.description, p.price, p.image_url, p.images
       FROM products p
       WHERE p.id = $1 AND p.is_active = true`,
      [productId]
    );

    if (result.rows.length === 0) {
      // Product not found — just redirect to products page
      return res.redirect(302, '/products');
    }

    const p = result.rows[0];

    // Pick best image: first from images array, or image_url
    let rawImage = p.image_url;
    if (p.images) {
      let imgs = p.images;
      // images column may come as a JS array (JSONB) or a JSON string
      if (typeof imgs === 'string') {
        try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; }
      }
      if (Array.isArray(imgs) && imgs.length > 0 && imgs[0]) {
        const first = imgs[0];
        // Each image entry is an object {url, ...} or a plain string
        rawImage = (typeof first === 'object' && first !== null) ? (first.url || first.src || p.image_url) : first;
      }
    }

    const ogImage = getImageUrl(rawImage);
    const ogTitle = escapeHtml(p.name) || 'TheNileKart Product';
    const ogDescription = escapeHtml(
      p.description
        ? p.description.replace(/\s+/g, ' ').trim().slice(0, 200)
        : `Shop ${p.name} on TheNileKart`
    );
    const ogUrl = `https://www.thenilekart.com/product/${encodeURIComponent(productId)}${offerCode ? `?offer=${encodeURIComponent(offerCode)}` : ''}`;
    const priceText = p.price ? `AED ${Number(p.price).toFixed(2)}` : '';
    const fullDescription = priceText ? `${priceText} — ${ogDescription}` : ogDescription;

    // Return HTML with OG tags + instant JS redirect for real users
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // No-cache so sharing always reflects latest product data
    res.setHeader('Cache-Control', 'no-store');

    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${ogTitle} | TheNileKart</title>

  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="TheNileKart" />
  <meta property="og:url" content="${ogUrl}" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${fullDescription}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="600" />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${ogTitle}" />
  <meta name="twitter:description" content="${fullDescription}" />
  <meta name="twitter:image" content="${ogImage}" />

  <!-- Telegram -->
  <meta name="description" content="${fullDescription}" />

  <!-- Instant redirect for real browsers (not crawlers) -->
  <meta http-equiv="refresh" content="0; url=${escapeHtml(quickViewTarget)}" />
  <script>
    // Redirect immediately — crawlers typically do not run JS
    window.location.replace(${JSON.stringify(quickViewTarget)});
  </script>
</head>
<body style="font-family:sans-serif;text-align:center;padding:40px;color:#333;">
  <p>Loading product...</p>
  <a href="${escapeHtml(quickViewTarget)}" style="color:#007bff;">Click here if not redirected</a>
</body>
</html>`);

  } catch (err) {
    console.error('[share] Error fetching product for OG tags:', err);
    // On any error, just redirect to the quick view so user isn't stuck
    return res.redirect(302, quickViewTarget);
  }
});

module.exports = router;
