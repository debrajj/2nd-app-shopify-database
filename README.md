# Shopify Image Upload App

A Shopify app for uploading and managing images using Shopify's native file storage system.

## Features

- Upload images directly to Shopify's file storage
- View all uploaded images in a dashboard
- RESTful API to access image data
- No external database required - uses Shopify's infrastructure

## Storage

Images are stored using **Shopify's Files API**, which provides:
- Reliable CDN-backed storage
- Automatic image optimization
- No additional storage costs
- Direct integration with Shopify's ecosystem

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_ACCESS_TOKEN=your_access_token
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
HOST=https://your-app-url.vercel.app
PORT=3001
```

3. Ensure your Shopify app has these scopes:
   - `read_products`
   - `write_products`
   - `read_content`
   - `write_content`
   - `read_files`
   - `write_files`

4. Run locally:
```bash
npm run dev
```

## API Endpoints

- `GET /api/images` - Get all images
- `GET /api/images/:id` - Get specific image (redirects to Shopify CDN URL)
- `POST /dashboard/upload` - Upload new image

## Deployment

Deploy to Vercel:
```bash
vercel --prod
```

Make sure to set environment variables in Vercel dashboard.