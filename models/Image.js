// Image storage using Shopify Metaobjects
// Stores image data directly in Shopify's database

const shopify = require('../config/shopify');

class ImageService {
  constructor(session) {
    this.session = session;
    this.client = new shopify.clients.Graphql({ session });
  }

  // Upload image as metaobject in Shopify
  async uploadImage(fileBuffer, filename, contentType) {
    try {
      console.log('Storing image in Shopify:', filename);
      
      // Convert buffer to base64
      const base64Data = fileBuffer.toString('base64');
      
      // Create metaobject to store image data
      const mutation = `
        mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
          metaobjectCreate(metaobject: $metaobject) {
            metaobject {
              id
              handle
              fields {
                key
                value
              }
              updatedAt
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const timestamp = Date.now();
      const handle = `image-${timestamp}`;

      const response = await this.client.query({
        data: {
          query: mutation,
          variables: {
            metaobject: {
              type: "image_storage",
              handle: handle,
              fields: [
                { key: "filename", value: filename },
                { key: "content_type", value: contentType },
                { key: "size", value: fileBuffer.length.toString() },
                { key: "data", value: base64Data },
                { key: "uploaded_at", value: new Date().toISOString() }
              ]
            }
          }
        }
      });

      if (response.body.data?.metaobjectCreate?.userErrors?.length > 0) {
        const errors = response.body.data.metaobjectCreate.userErrors;
        throw new Error(`Metaobject create error: ${errors.map(e => e.message).join(', ')}`);
      }

      const metaobject = response.body.data.metaobjectCreate.metaobject;
      console.log('✓ Image stored in Shopify:', metaobject.id);

      // Return in a format similar to file API
      return {
        id: metaobject.id,
        alt: filename,
        createdAt: metaobject.updatedAt,
        fileStatus: 'READY',
        url: `/api/images/${metaobject.id.split('/').pop()}`,
        mimeType: contentType,
        originalFileSize: fileBuffer.length
      };
    } catch (error) {
      console.error('Upload error details:', error);
      throw error;
    }
  }

  // Get all images from Shopify metaobjects
  async getAllImages() {
    const query = `
      query {
        metaobjects(type: "image_storage", first: 250) {
          edges {
            node {
              id
              handle
              fields {
                key
                value
              }
              updatedAt
            }
          }
        }
      }
    `;

    try {
      const response = await this.client.query({
        data: { query }
      });

      if (!response.body.data?.metaobjects) {
        return [];
      }

      return response.body.data.metaobjects.edges.map(edge => {
        const fields = {};
        edge.node.fields.forEach(field => {
          fields[field.key] = field.value;
        });

        return {
          id: edge.node.id,
          alt: fields.filename || 'Untitled',
          createdAt: fields.uploaded_at || edge.node.updatedAt,
          fileStatus: 'READY',
          url: `/api/images/${edge.node.id.split('/').pop()}`,
          mimeType: fields.content_type,
          originalFileSize: parseInt(fields.size || '0')
        };
      });
    } catch (error) {
      console.error('Error fetching images:', error);
      return [];
    }
  }

  // Get single image by ID
  async getImageById(metaobjectId) {
    const query = `
      query($id: ID!) {
        metaobject(id: $id) {
          id
          handle
          fields {
            key
            value
          }
          updatedAt
        }
      }
    `;

    const fullId = metaobjectId.startsWith('gid://') 
      ? metaobjectId 
      : `gid://shopify/Metaobject/${metaobjectId}`;

    const response = await this.client.query({
      data: {
        query,
        variables: { id: fullId }
      }
    });

    if (!response.body.data?.metaobject) {
      return null;
    }

    const metaobject = response.body.data.metaobject;
    const fields = {};
    metaobject.fields.forEach(field => {
      fields[field.key] = field.value;
    });

    return {
      id: metaobject.id,
      filename: fields.filename,
      contentType: fields.content_type,
      size: parseInt(fields.size || '0'),
      data: fields.data, // base64 data
      uploadedAt: fields.uploaded_at
    };
  }

  // Delete image from Shopify
  async deleteImage(metaobjectId) {
    const mutation = `
      mutation metaobjectDelete($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors {
            field
            message
          }
        }
      }
    `;

    const fullId = metaobjectId.startsWith('gid://') 
      ? metaobjectId 
      : `gid://shopify/Metaobject/${metaobjectId}`;

    const response = await this.client.query({
      data: {
        query: mutation,
        variables: {
          id: fullId
        }
      }
    });

    return response.body.data.metaobjectDelete;
  }
}

module.exports = ImageService;
