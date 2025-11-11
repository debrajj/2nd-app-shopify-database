const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
require('@shopify/shopify-api/adapters/node');

// Get hostname from environment or use Vercel URL
const getHostName = () => {
  if (process.env.HOST) {
    return process.env.HOST.replace(/https?:\/\//, '');
  }
  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL;
  }
  return 'localhost:3001';
};

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ['read_products', 'write_products', 'read_content', 'write_content', 'read_files', 'write_files'],
  hostName: getHostName(),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
});

module.exports = shopify;
