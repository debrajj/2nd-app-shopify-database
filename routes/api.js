const express = require('express');
const router = express.Router();
const ImageService = require('../models/Image');
const shopify = require('../config/shopify');

// Helper to get session
async function getSession(req) {
  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  
  if (!shop || !accessToken) {
    throw new Error('Missing Shopify credentials');
  }

  return {
    shop,
    accessToken,
    isOnline: false
  };
}

// Get all images from Shopify
router.get('/images', async (req, res) => {
  try {
    const session = await getSession(req);
    const imageService = new ImageService(session);
    const images = await imageService.getAllImages();
    
    const imageData = images.map(img => ({
      id: img.id,
      filename: img.alt,
      url: img.url,
      contentType: img.mimeType,
      size: img.originalFileSize,
      uploadedAt: img.createdAt,
      status: img.fileStatus,
      shop: session.shop
    }));

    res.json({
      success: true,
      count: imageData.length,
      images: imageData,
      storage: 'shopify'
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single image by ID (redirects to Shopify URL)
router.get('/images/:id', async (req, res) => {
  try {
    const session = await getSession(req);
    const imageService = new ImageService(session);
    
    // Ensure ID has proper Shopify format
    let fileId = req.params.id;
    if (!fileId.startsWith('gid://')) {
      fileId = `gid://shopify/GenericFile/${fileId}`;
    }
    
    const image = await imageService.getImageById(fileId);
    
    if (!image || !image.url) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Redirect to Shopify CDN URL
    res.redirect(image.url);
  } catch (error) {
    console.error('Image fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
