const express = require('express');
const router = express.Router();
const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
require('@shopify/shopify-api/adapters/node');

// Get hostname from environment or use Vercel URL
const getHostName = () => {
  // In production, use the production Vercel URL
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return process.env.VERCEL_PROJECT_PRODUCTION_URL;
  }
  // For preview deployments
  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL;
  }
  // Custom HOST from env (remove protocol if present)
  if (process.env.HOST) {
    return process.env.HOST.replace(/https?:\/\//, '');
  }
  // Fallback for local development
  return 'localhost:3001';
};

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ['read_products', 'write_products'],
  hostName: getHostName(),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
  hostScheme: process.env.NODE_ENV === 'production' ? 'https' : 'http',
});

// Start OAuth flow
router.get('/shopify', async (req, res) => {
  const shop = req.query.shop || process.env.SHOPIFY_SHOP_DOMAIN;
  
  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }

  try {
    await shopify.auth.begin({
      shop: shopify.utils.sanitizeShop(shop, true),
      callbackPath: '/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });
    // Response is handled by shopify.auth.begin
  } catch (error) {
    console.error('Auth error:', error);
    if (!res.headersSent) {
      res.status(500).send('Authentication failed');
    }
  }
});

// OAuth callback
router.get('/callback', async (req, res) => {
  try {
    console.log('Callback received with query:', req.query);
    console.log('Hostname:', getHostName());
    
    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const { session } = callback;
    console.log('Session created successfully:', session.shop);
    
    // Store session/token (in production, use a proper session store)
    res.cookie('shopify_session', JSON.stringify(session), { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 
    });

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Callback error details:', {
      message: error.message,
      stack: error.stack,
      query: req.query,
      hostname: getHostName()
    });
    res.status(500).send(`Authentication callback failed: ${error.message}`);
  }
});

module.exports = router;
