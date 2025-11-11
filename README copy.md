# Shopify Image Upload App

A custom Shopify app built with Node.js, Express, MongoDB Atlas, and the Shopify API for managing image uploads. Deployable to Vercel.

## Features

- ✅ Shopify OAuth authentication
- ✅ Image upload dashboard
- ✅ MongoDB Atlas GridFS storage for images
- ✅ Public API endpoint for image data
- ✅ Image viewing and management
- ✅ Vercel deployment ready

## Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Update with your Shopify credentials and MongoDB Atlas connection string
   - For local dev, use `HOST=http://localhost:3001`

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Access locally:**
   - Open http://localhost:3001
   - Click "Install App" to authenticate with Shopify
   - Access dashboard at http://localhost:3001/dashboard

## Shopify App Setup

1. **Create a Shopify App:**
   - Go to your Shopify Partner Dashboard: https://partners.shopify.com
   - Click "Apps" → "Create app" → "Create app manually"
   - Enter app name and select "Public app"

2. **Configure App URLs (after Vercel deployment):**
   - App URL: `https://your-app.vercel.app`
   - Allowed redirection URL(s): `https://your-app.vercel.app/auth/callback`
   - Copy your API key and API secret key

3. **Update your `.env` file:**
   - Add your `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`
   - Update `HOST` to your Vercel URL

## Vercel Deployment

1. **Install Vercel CLI (optional):**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel:**
   
   **Option A: Using Vercel CLI**
   ```bash
   vercel
   ```
   
   **Option B: Using Vercel Dashboard**
   - Push your code to GitHub
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard

3. **Add Environment Variables in Vercel:**
   - Go to your project settings in Vercel
   - Navigate to "Environment Variables"
   - Add all variables from your `.env` file:
     - `SHOPIFY_API_KEY`
     - `SHOPIFY_API_SECRET`
     - `SHOPIFY_ACCESS_TOKEN`
     - `SHOPIFY_SHOP_DOMAIN`
     - `MONGODB_URI`
     - `HOST` (set to your Vercel URL: `https://your-app.vercel.app`)

4. **Update Shopify App Settings:**
   - Go back to your Shopify Partner Dashboard
   - Update App URL to your Vercel URL
   - Update redirect URLs to include your Vercel callback URL
   - Update `shopify.app.toml` with your Vercel URL

5. **Install the app:**
   - Visit `https://your-app.vercel.app`
   - Click "Install App"
   - Authorize the app in your Shopify store

## API Endpoints

### Get All Images
```
GET /api/images
```

Returns JSON with all uploaded images metadata and URLs.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "images": [
    {
      "id": "...",
      "filename": "...",
      "originalName": "photo.jpg",
      "contentType": "image/jpeg",
      "size": 123456,
      "uploadedAt": "2025-11-10T...",
      "url": "http://localhost:3000/api/images/...",
      "shop": "testing-appx.myshopify.com"
    }
  ]
}
```

### Get Single Image
```
GET /api/images/:id
```

Returns the actual image file.

## Project Structure

```
├── server.js              # Main application entry
├── config/
│   └── shopify.js        # Shopify API configuration
├── models/
│   └── Image.js          # Image metadata model
├── routes/
│   ├── auth.js           # OAuth authentication routes
│   ├── images.js         # Dashboard and upload routes
│   └── api.js            # Public API endpoints
├── .env                  # Environment variables
└── package.json          # Dependencies
```

## Notes

- Images are stored in MongoDB using GridFS
- The app uses offline access tokens for Shopify API
- For production, implement proper session management and security measures
- Make sure to configure your Shopify app's redirect URLs to match your HOST
