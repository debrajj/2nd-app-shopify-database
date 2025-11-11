const express = require('express');
const router = express.Router();
const multer = require('multer');
const ImageService = require('../models/Image');
const shopify = require('../config/shopify');

// Use memory storage for multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit (Shopify supports larger files)
});

// Helper to get or create session
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

// Dashboard page
router.get('/', async (req, res) => {
  try {
    const session = await getSession(req);
    const imageService = new ImageService(session);
    const images = await imageService.getAllImages();
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Image Dashboard - Shopify Storage</title>
        <style>
          body { font-family: Arial; max-width: 1200px; margin: 0 auto; padding: 20px; }
          h1 { color: #5c6ac4; }
          .badge { background: #00a047; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; }
          .upload-form { background: #f4f6f8; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
          .image-card { border: 1px solid #ddd; border-radius: 8px; padding: 10px; background: white; }
          .image-card img { width: 100%; height: 150px; object-fit: cover; border-radius: 4px; }
          .image-info { margin-top: 10px; font-size: 12px; color: #666; }
          button { background: #5c6ac4; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
          button:hover { background: #4c5ab4; }
          input[type="file"] { margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>📸 Image Upload Dashboard <span class="badge">Shopify Storage</span></h1>
        
        <div class="upload-form">
          <h2>Upload New Image</h2>
          <form action="/dashboard/upload" method="POST" enctype="multipart/form-data">
            <input type="file" name="image" accept="image/*" required>
            <button type="submit">Upload to Shopify</button>
          </form>
        </div>

        <h2>Uploaded Images (${images.length})</h2>
        <div class="images-grid">
          ${images.map(img => `
            <div class="image-card">
              <img src="${img.url}" alt="${img.alt || 'Image'}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22150%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22%3ENo Preview%3C/text%3E%3C/svg%3E'">
              <div class="image-info">
                <strong>${img.alt || 'Untitled'}</strong><br>
                Size: ${img.originalFileSize ? (img.originalFileSize / 1024).toFixed(2) + ' KB' : 'N/A'}<br>
                Uploaded: ${new Date(img.createdAt).toLocaleDateString()}<br>
                Status: ${img.fileStatus}
              </div>
            </div>
          `).join('')}
        </div>

        <br><br>
        <p><strong>API Endpoint:</strong> <code>GET /api/images</code> - Returns all image data</p>
        <p><a href="/api/images" target="_blank">View API Response</a></p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send(`Error loading dashboard: ${error.message}`);
  }
});

// Upload image to Shopify
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const session = await getSession(req);
    const imageService = new ImageService(session);
    
    const filename = `${Date.now()}-${req.file.originalname}`;
    
    // Upload to Shopify Files API
    const uploadedFile = await imageService.uploadImage(
      req.file.buffer,
      filename,
      req.file.mimetype
    );

    console.log('File uploaded to Shopify:', uploadedFile);
    res.redirect('/dashboard');

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).send(`Upload failed: ${error.message}`);
  }
});

module.exports = router;
