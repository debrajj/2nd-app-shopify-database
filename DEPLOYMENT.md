# Deployment Guide - GitHub to Vercel

## Quick Deploy from GitHub (Recommended)

### Step 1: Push Your Code to GitHub ✅

Your code is already on GitHub at:
```
https://github.com/debrajj/shopify-json-frist-mongodb
```

### Step 2: Deploy to Vercel from GitHub

1. **Go to Vercel:**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with your GitHub account (or create a Vercel account)

2. **Import Your Repository:**
   - Click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Find and select: `debrajj/shopify-json-frist-mongodb`
   - Click **"Import"**

3. **Configure Project:**
   - **Framework Preset**: Other (or leave as detected)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: Leave empty (not needed for this project)
   - **Output Directory**: Leave empty
   - Click **"Deploy"** (don't worry about environment variables yet)

4. **Wait for Initial Deployment:**
   - Vercel will deploy your app (it may fail initially without env variables - that's okay)
   - Copy your deployment URL (e.g., `https://shopify-json-frist-mongodb.vercel.app`)

### Step 3: Add Environment Variables

1. **In Vercel Dashboard:**
   - Go to your project
   - Click **"Settings"** tab
   - Click **"Environment Variables"** in the left sidebar

2. **Add These Variables:**
   
   | Name | Value |
   |------|-------|
   | `SHOPIFY_API_KEY` | Your Shopify API key |
   | `SHOPIFY_API_SECRET` | Your Shopify API secret |
   | `SHOPIFY_ACCESS_TOKEN` | Your Shopify access token |
   | `SHOPIFY_SHOP_DOMAIN` | your-store.myshopify.com |
   | `HOST` | https://your-vercel-url.vercel.app |
   | `PORT` | `3001` |

   **Important:** For each variable:
   - Click **"Add New"**
   - Enter the **Name** and **Value**
   - Select **"Production"**, **"Preview"**, and **"Development"**
   - Click **"Save"**

3. **Redeploy:**
   - Go to **"Deployments"** tab
   - Click the **"..."** menu on the latest deployment
   - Click **"Redeploy"**
   - Check **"Use existing Build Cache"**
   - Click **"Redeploy"**

### Step 4: Configure MongoDB Atlas

1. **Allow Vercel IPs:**
   - Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com)
   - Navigate to **Network Access**
   - Click **"Add IP Address"**
   - Select **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Click **"Confirm"**

### Step 5: Update Shopify App Settings

1. **Go to Shopify Partners Dashboard:**
   - Visit [partners.shopify.com](https://partners.shopify.com)
   - Go to **Apps** → Select your app

2. **Update URLs:**
   - **App URL**: `https://your-vercel-url.vercel.app`
   - **Allowed redirection URL(s)**: 
     - `https://your-vercel-url.vercel.app/auth/callback`
     - `http://localhost:3001/auth/callback` (keep for local testing)
   - Click **"Save"**

### Step 6: Test Your Deployed App

1. Visit your Vercel URL: `https://your-vercel-url.vercel.app`
2. Click **"Install App"** or go to `/dashboard`
3. Upload an image to test
4. Check API: `https://your-vercel-url.vercel.app/api/images`

---

## Alternative: Deploy via Vercel CLI

If you prefer using the command line:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Add environment variables
vercel env add SHOPIFY_API_KEY
vercel env add SHOPIFY_API_SECRET
vercel env add SHOPIFY_ACCESS_TOKEN
vercel env add SHOPIFY_SHOP_DOMAIN
vercel env add MONGODB_URI
vercel env add HOST

# Deploy to production
vercel --prod
```

---

## Troubleshooting

### ❌ Deployment Fails
- Check Vercel deployment logs for errors
- Ensure all environment variables are set correctly
- Verify MongoDB connection string is correct

### ❌ MongoDB Connection Error
- Ensure MongoDB Atlas allows connections from anywhere (0.0.0.0/0)
- Check that password in connection string is URL-encoded
- Verify database name is included in connection string

### ❌ OAuth/Redirect Errors
- Verify redirect URLs in Shopify app settings match your Vercel URL exactly
- Ensure HOST environment variable matches your Vercel URL (with https://)
- Check that SHOPIFY_API_KEY and SHOPIFY_API_SECRET are correct

### ❌ Images Not Uploading
- Check Vercel function logs
- Verify MongoDB connection is working
- Ensure GridFS bucket is created properly

---

## Environment Variables Reference

```env
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_ACCESS_TOKEN=your_access_token_here
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
HOST=https://your-vercel-url.vercel.app
PORT=3001
```

**Note:** Get your actual credentials from your `.env` file (not 

---

## Automatic Deployments

Once connected to GitHub, Vercel will automatically:
- ✅ Deploy every push to `main` branch
- ✅ Create preview deployments for pull requests
- ✅ Show deployment status in GitHub

---

## Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repository**: https://github.com/debrajj/shopify-json-frist-mongodb
- **Shopify Partners**: https://partners.shopify.com
- **MongoDB Atlas**: https://cloud.mongodb.com
