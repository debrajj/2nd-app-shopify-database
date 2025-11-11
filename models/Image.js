// Image storage using Shopify Product Images
// Uploads files to Shopify CDN and shows in Admin → Content → Files

const shopify = require('../config/shopify');

class ImageService {
  constructor(session) {
    this.session = session;
    this.client = new shopify.clients.Graphql({ session });
  }

  // Get or create a dummy product for storing images
  async getStorageProduct() {
    // Check if storage product exists
    const query = `
      query {
        products(first: 1, query: "tag:image-storage-app") {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `;

    const response = await this.client.query({
      data: { query }
    });

    if (response.body.data.products.edges.length > 0) {
      return response.body.data.products.edges[0].node.id;
    }

    // Create storage product
    const createMutation = `
      mutation productCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const createResponse = await this.client.query({
      data: {
        query: createMutation,
        variables: {
          input: {
            title: "Image Storage (App)",
            status: "DRAFT",
            tags: ["image-storage-app", "do-not-delete"]
          }
        }
      }
    });

    if (createResponse.body.data.productCreate.userErrors?.length > 0) {
      throw new Error(`Product create error: ${createResponse.body.data.productCreate.userErrors.map(e => e.message).join(', ')}`);
    }

    return createResponse.body.data.productCreate.product.id;
  }

  // Upload image to Shopify CDN via product media
  async uploadImage(fileBuffer, filename, contentType) {
    try {
      console.log('Uploading file to Shopify CDN:', filename);
      
      // Get storage product
      const productId = await this.getStorageProduct();
      console.log('✓ Using storage product:', productId);

      // Convert to base64 for upload
      const base64Data = fileBuffer.toString('base64');
      const dataUrl = `data:${contentType};base64,${base64Data}`;

      // Upload as product media
      const mutation = `
        mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
          productCreateMedia(media: $media, productId: $productId) {
            media {
              ... on MediaImage {
                id
                image {
                  url
                  altText
                }
                status
                mediaContentType
                createdAt
              }
            }
            mediaUserErrors {
              field
              message
            }
          }
        }
      `;

      const response = await this.client.query({
        data: {
          query: mutation,
          variables: {
            productId: productId,
            media: [{
              alt: filename,
              mediaContentType: "IMAGE",
              originalSource: dataUrl
            }]
          }
        }
      });

      if (response.body.data.productCreateMedia.mediaUserErrors?.length > 0) {
        const errors = response.body.data.productCreateMedia.mediaUserErrors;
        throw new Error(`Media upload error: ${errors.map(e => e.message).join(', ')}`);
      }

      const media = response.body.data.productCreateMedia.media[0];
      console.log('✓ File uploaded to Shopify CDN:', media.image.url);

      return {
        id: media.id,
        url: media.image.url,
        alt: media.image.altText || filename,
        createdAt: media.createdAt,
        fileStatus: media.status,
        mimeType: contentType,
        originalFileSize: fileBuffer.length
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // Get all images from product media
  async getAllImages() {
    try {
      const productId = await this.getStorageProduct();

      const query = `
        query($id: ID!) {
          product(id: $id) {
            media(first: 250) {
              edges {
                node {
                  ... on MediaImage {
                    id
                    image {
                      url
                      altText
                    }
                    status
                    mediaContentType
                    createdAt
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.client.query({
        data: {
          query,
          variables: { id: productId }
        }
      });

      if (!response.body.data?.product?.media) {
        return [];
      }

      return response.body.data.product.media.edges.map(edge => ({
        id: edge.node.id,
        url: edge.node.image.url,
        alt: edge.node.image.altText || 'Image',
        createdAt: edge.node.createdAt,
        fileStatus: edge.node.status,
        mimeType: 'image/*',
        originalFileSize: null
      }));
    } catch (error) {
      console.error('Error fetching images:', error);
      return [];
    }
  }

  // Get single image by ID
  async getImageById(mediaId) {
    const query = `
      query($id: ID!) {
        node(id: $id) {
          ... on MediaImage {
            id
            image {
              url
              altText
            }
            status
            createdAt
          }
        }
      }
    `;

    const fullId = mediaId.startsWith('gid://') 
      ? mediaId 
      : `gid://shopify/MediaImage/${mediaId}`;

    const response = await this.client.query({
      data: {
        query,
        variables: { id: fullId }
      }
    });

    const node = response.body.data?.node;
    if (!node) return null;

    return {
      id: node.id,
      url: node.image.url,
      alt: node.image.altText,
      createdAt: node.createdAt,
      fileStatus: node.status
    };
  }

  // Delete image from Shopify
  async deleteImage(mediaId) {
    const productId = await this.getStorageProduct();

    const mutation = `
      mutation productDeleteMedia($mediaIds: [ID!]!, $productId: ID!) {
        productDeleteMedia(mediaIds: $mediaIds, productId: $productId) {
          deletedMediaIds
          userErrors {
            field
            message
          }
        }
      }
    `;

    const fullId = mediaId.startsWith('gid://') 
      ? mediaId 
      : `gid://shopify/MediaImage/${mediaId}`;

    const response = await this.client.query({
      data: {
        query: mutation,
        variables: {
          productId: productId,
          mediaIds: [fullId]
        }
      }
    });

    return response.body.data.productDeleteMedia;
  }
}

module.exports = ImageService;
