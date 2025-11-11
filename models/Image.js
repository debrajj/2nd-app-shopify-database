// Image storage using Shopify REST API
// Uploads files to Shopify CDN and shows in Admin → Products

const shopify = require('../config/shopify');

class ImageService {
  constructor(session) {
    this.session = session;
    this.restClient = new shopify.clients.Rest({ session });
  }

  // Get or create a dummy product for storing images (using REST API)
  async getStorageProduct() {
    try {
      // Search for existing storage product
      const products = await this.restClient.get({
        path: 'products',
        query: { limit: 1, title: 'Image Storage App' }
      });

      if (products.body.products && products.body.products.length > 0) {
        return products.body.products[0].id;
      }

      // Create storage product
      const createResponse = await this.restClient.post({
        path: 'products',
        data: {
          product: {
            title: 'Image Storage App',
            body_html: 'This product stores uploaded images. Do not delete.',
            vendor: 'App',
            product_type: 'Storage',
            status: 'draft',
            tags: 'image-storage-app,do-not-delete'
          }
        }
      });

      return createResponse.body.product.id;
    } catch (error) {
      console.error('Error getting storage product:', error);
      throw error;
    }
  }

  // Upload image using REST API (simpler, no staged uploads)
  async uploadImage(fileBuffer, filename, contentType) {
    try {
      console.log('Uploading file to Shopify CDN:', filename);
      
      // Get storage product
      const productId = await this.getStorageProduct();
      console.log('✓ Using storage product:', productId);

      // Convert to base64
      const base64Data = fileBuffer.toString('base64');

      // Upload image using REST API
      const response = await this.restClient.post({
        path: `products/${productId}/images`,
        data: {
          image: {
            attachment: base64Data,
            filename: filename,
            alt: filename
          }
        }
      });

      const image = response.body.image;
      console.log('✓ File uploaded to Shopify CDN:', image.src);

      return {
        id: `gid://shopify/ProductImage/${image.id}`,
        url: image.src,
        alt: image.alt || filename,
        createdAt: image.created_at,
        fileStatus: 'READY',
        mimeType: contentType,
        originalFileSize: fileBuffer.length
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // Get all images from product
  async getAllImages() {
    try {
      const productId = await this.getStorageProduct();

      const response = await this.restClient.get({
        path: `products/${productId}/images`
      });

      if (!response.body.images) {
        return [];
      }

      return response.body.images.map(img => ({
        id: `gid://shopify/ProductImage/${img.id}`,
        url: img.src,
        alt: img.alt || 'Image',
        createdAt: img.created_at,
        fileStatus: 'READY',
        mimeType: 'image/*',
        originalFileSize: null
      }));
    } catch (error) {
      console.error('Error fetching images:', error);
      return [];
    }
  }

  // Get single image by ID
  async getImageById(imageId) {
    try {
      const productId = await this.getStorageProduct();
      
      // Extract numeric ID from GID if needed
      const numericId = imageId.includes('/') ? imageId.split('/').pop() : imageId;

      const response = await this.restClient.get({
        path: `products/${productId}/images/${numericId}`
      });

      const img = response.body.image;
      
      return {
        id: `gid://shopify/ProductImage/${img.id}`,
        url: img.src,
        alt: img.alt,
        createdAt: img.created_at,
        fileStatus: 'READY'
      };
    } catch (error) {
      console.error('Error fetching image:', error);
      return null;
    }
  }

  // Delete image from Shopify
  async deleteImage(imageId) {
    try {
      const productId = await this.getStorageProduct();
      
      // Extract numeric ID from GID if needed
      const numericId = imageId.includes('/') ? imageId.split('/').pop() : imageId;

      await this.restClient.delete({
        path: `products/${productId}/images/${numericId}`
      });

      return { deletedId: imageId };
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }
}

module.exports = ImageService;
