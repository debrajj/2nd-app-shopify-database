// Image storage using Shopify Metaobjects
// Stores image data directly in Shopify's database

const shopify = require('../config/shopify');

class ImageService {
  constructor(session) {
    this.session = session;
    this.client = new shopify.clients.Graphql({ session });
  }

  // Create metaobject definition if it doesn't exist
  async ensureMetaobjectDefinition() {
    try {
      const createDefinitionMutation = `
        mutation CreateMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
          metaobjectDefinitionCreate(definition: $definition) {
            metaobjectDefinition {
              id
              type
              name
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const response = await this.client.query({
        data: {
          query: createDefinitionMutation,
          variables: {
            definition: {
              type: "image_storage",
              name: "Image Storage",
              fieldDefinitions: [
                {
                  key: "filename",
                  name: "Filename",
                  type: "single_line_text_field"
                },
                {
                  key: "content_type",
                  name: "Content Type",
                  type: "single_line_text_field"
                },
                {
                  key: "size",
                  name: "Size",
                  type: "single_line_text_field"
                },
                {
                  key: "data",
                  name: "Data",
                  type: "multi_line_text_field"
                },
                {
                  key: "uploaded_at",
                  name: "Uploaded At",
                  type: "single_line_text_field"
                }
              ]
            }
          }
        }
      });

      if (response.body.data?.metaobjectDefinitionCreate?.userErrors?.length > 0) {
        const errors = response.body.data.metaobjectDefinitionCreate.userErrors;
        // If definition already exists, that's fine
        if (errors[0].code === 'TAKEN') {
          console.log('✓ Metaobject definition already exists');
          return true;
        }
        console.error('Definition creation errors:', errors);
        return false;
      }

      console.log('✓ Metaobject definition created successfully');
      return true;
    } catch (error) {
      console.error('Error creating metaobject definition:', error);
      return false;
    }
  }

  // Upload image as metaobject in Shopify (with size limit check)
  async uploadImage(fileBuffer, filename, contentType) {
    // Ensure metaobject definition exists
    await this.ensureMetaobjectDefinition();
    try {
      console.log('Storing image in Shopify:', filename);
      
      // Convert buffer to base64
      const base64Data = fileBuffer.toString('base64');
      
      // Check size limit (Shopify metaobject fields have 65KB limit)
      const MAX_SIZE = 50000; // 50KB base64 (~37KB original file)
      
      if (base64Data.length > MAX_SIZE) {
        throw new Error(`Image too large. Maximum size is ~37KB. Your image is ${Math.round(fileBuffer.length / 1024)}KB. Please upload a smaller image.`);
      }
      
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
