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
  
  if (!shop) {
    throw new Error('SHOPIFY_SHOP_DOMAIN is not configured in environment variables');
  }
  
  if (!accessToken) {
    throw new Error('SHOPIFY_ACCESS_TOKEN is not configured in environment variables');
  }

  console.log('Using Shopify session for shop:', shop);

  return {
    shop,
    accessToken,
    isOnline: false,
    state: 'test',
    scope: 'read_products,write_products,read_content,write_content,read_files,write_files'
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
          body { font-family: Arial; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f9fafb; }
          h1 { color: #5c6ac4; }
          .badge { background: #00a047; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; }
          .badge.processing { background: #ffa500; }
          .upload-form { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .refresh-btn { background: #fff; color: #5c6ac4; border: 1px solid #5c6ac4; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
          .refresh-btn:hover { background: #f4f6f8; }
          .images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
          .image-card { border: 1px solid #e1e3e5; border-radius: 8px; padding: 12px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: transform 0.2s; }
          .image-card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .image-card img { width: 100%; height: 150px; object-fit: cover; border-radius: 4px; background: #f4f6f8; }
          .image-info { margin-top: 10px; font-size: 12px; color: #666; }
          .image-info strong { color: #202223; display: block; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .status-badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
          .status-ready { background: #d4f4dd; color: #108043; }
          .status-processing { background: #fff4e6; color: #b95000; }
          button { background: #5c6ac4; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; }
          button:hover { background: #4c5ab4; }
          input[type="file"] { margin: 10px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%; max-width: 400px; }
          .api-info { background: #fff; padding: 15px; border-radius: 8px; margin-top: 20px; }
          .api-info code { background: #f4f6f8; padding: 2px 6px; border-radius: 3px; }
          .loading { display: none; }
          .empty-state { text-align: center; padding: 40px; color: #999; }
        </style>
      </head>
      <body>
        <h1>📸 Image Upload Dashboard <span class="badge">Shopify Storage</span></h1>
        
        <div class="upload-form">
          <h2>Upload New Image</h2>
          <form action="/dashboard/upload" method="POST" enctype="multipart/form-data" id="uploadForm">
            <input type="file" name="image" accept="image/*" required id="fileInput">
            <button type="submit" id="uploadBtn">Upload to Shopify</button>
            <span class="loading" id="loading">⏳ Uploading...</span>
          </form>
        </div>

        <div class="header-actions">
          <h2>Uploaded Images (${images.length})</h2>
          <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
        </div>

        ${images.length === 0 ? `
          <div class="empty-state">
            <p>No images uploaded yet. Upload your first image above!</p>
          </div>
        ` : `
          <div class="images-grid">
            ${images.map(img => {
              const isProcessing = img.fileStatus === 'PROCESSING';
              const fileSize = img.originalFileSize ? (img.originalFileSize / 1024).toFixed(2) + ' KB' : 'Processing...';
              
              return `
                <div class="image-card">
                  <img src="${img.url || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22150%22%3E%3Crect fill=%22%23f4f6f8%22 width=%22200%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2214%22%3EProcessing...%3C/text%3E%3C/svg%3E'}" 
                       alt="${img.alt || 'Image'}" 
                       onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22150%22%3E%3Crect fill=%22%23f4f6f8%22 width=%22200%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2214%22%3ENo Preview%3C/text%3E%3C/svg%3E'">
                  <div class="image-info">
                    <strong title="${img.alt || 'Untitled'}">${img.alt || 'Untitled'}</strong>
                    Size: ${fileSize}<br>
                    Uploaded: ${new Date(img.createdAt).toLocaleDateString()}<br>
                    <span class="status-badge ${isProcessing ? 'status-processing' : 'status-ready'}">${img.fileStatus}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        <div class="api-info">
          <p><strong>API Endpoint:</strong> <code>GET /api/images</code> - Returns all image data</p>
          <p><a href="/api/images" target="_blank">View API Response →</a></p>
          <p style="font-size: 12px; color: #999; margin-top: 10px;">
            💡 Tip: If images show "PROCESSING" status, refresh the page after a few seconds.
          </p>
        </div>

        <script>
          const form = document.getElementById('uploadForm');
          const uploadBtn = document.getElementById('uploadBtn');
          const loading = document.getElementById('loading');
          const fileInput = document.getElementById('fileInput');

          form.addEventListener('submit', function() {
            uploadBtn.style.display = 'none';
            loading.style.display = 'inline';
          });

          // Auto-refresh if there are processing files
          const hasProcessing = ${images.some(img => img.fileStatus === 'PROCESSING')};
          if (hasProcessing) {
            setTimeout(() => location.reload(), 5000);
          }
        </script>
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
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h2>❌ No file uploaded</h2>
            <p>Please select a file to upload.</p>
            <a href="/dashboard" style="color: #5c6ac4;">← Back to Dashboard</a>
          </body>
        </html>
      `);
    }

    const session = await getSession(req);
    const imageService = new ImageService(session);
    
    const filename = `${Date.now()}-${req.file.originalname}`;
    
    console.log(`Uploading file: ${filename} (${req.file.size} bytes)`);
    
    // Upload to Shopify Files API
    const uploadedFile = await imageService.uploadImage(
      req.file.buffer,
      filename,
      req.file.mimetype
    );

    console.log('✅ File uploaded to Shopify:', {
      id: uploadedFile.id,
      status: uploadedFile.fileStatus,
      url: uploadedFile.url
    });

    // Redirect back to dashboard
    res.redirect('/dashboard');

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h2>❌ Upload Failed</h2>
          <p>${error.message}</p>
          <pre style="background: #f4f6f8; padding: 15px; border-radius: 4px; text-align: left; overflow: auto;">${error.stack}</pre>
          <a href="/dashboard" style="color: #5c6ac4;">← Back to Dashboard</a>
        </body>
      </html>
    `);
  }
});

module.exports = router;
