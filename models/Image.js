// Image storage using Shopify Files API
// Uploads files to Shopify CDN (https://cdn.shopify.com/...)

const shopify = require('../config/shopify');
const fetch = require('node-fetch');
const FormData = require('form-data');

class ImageService {
  constructor(session) {
    this.session = session;
    this.client = new shopify.clients.Graphql({ session });
  }

  // Upload image to Shopify Files API using IMAGE resource type (simpler)
  async uploadImage(fileBuffer, filename, contentType) {
    try {
      console.log('Uploading file to Shopify CDN:', filename);
      
      // Use IMAGE resource type instead of FILE - it's simpler and works better
      const stagedUploadMutation = `
        mutation generateStagedUploads($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters {
                name
                value
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const stagedResponse = await this.client.query({
        data: {
          query: stagedUploadMutation,
          variables: {
            input: [{
              filename: filename,
              mimeType: contentType,
              resource: "IMAGE", // Changed from FILE to IMAGE
              fileSize: fileBuffer.length.toString(),
              httpMethod: "POST"
            }]
          }
        }
      });

      if (stagedResponse.body.data.stagedUploadsCreate.userErrors?.length > 0) {
        throw new Error(`Staged upload error: ${stagedResponse.body.data.stagedUploadsCreate.userErrors.map(e => e.message).join(', ')}`);
      }

      const { url, resourceUrl, parameters } = stagedResponse.body.data.stagedUploadsCreate.stagedTargets[0];
      console.log('✓ Staged upload URL generated');
      console.log('Parameters:', parameters);

      // Step 2: Upload file to Google Cloud Storage
      const formData = new FormData();
      
      // Add all parameters from Shopify
      parameters.forEach(param => {
        formData.append(param.name, param.value);
      });
      
      // Add file
      formData.append('file', fileBuffer, {
        filename: filename,
        contentType: contentType
      });

      const uploadResponse = await fetch(url, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('GCS upload error:', errorText);
        throw new Error(`GCS upload failed (${uploadResponse.status}): ${errorText}`);
      }

      console.log('✓ File uploaded to GCS');

      // Step 3: Create file record in Shopify using productCreateMedia
      const productCreateMutation = `
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
              }
            }
            mediaUserErrors {
              field
              message
            }
          }
        }
      `;

      // For now, just return the resource URL since we need a product ID
      // In a real app, you'd attach this to a product
      console.log('✓ File uploaded, resource URL:', resourceUrl);

      return {
        id: `temp-${Date.now()}`,
        url: resourceUrl,
        alt: filename,
        createdAt: new Date().toISOString(),
        fileStatus: 'READY',
        mimeType: contentType,
        originalFileSize: fileBuffer.length
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // Get all files from Shopify
  async getAllImages() {
    const query = `
      query {
        files(first: 250, query: "media_type:GENERIC_FILE") {
          edges {
            node {
              ... on GenericFile {
                id
                url
                alt
                createdAt
                fileStatus
                mimeType
                originalFileSize
              }
            }
          }
        }
      }
    `;

    try {
      const response = await this.client.query({
        data: { query }
      });

      if (!response.body.data?.files) {
        return [];
      }

      return response.body.data.files.edges.map(edge => edge.node);
    } catch (error) {
      console.error('Error fetching files:', error);
      return [];
    }
  }

  // Get single file by ID
  async getImageById(fileId) {
    const query = `
      query($id: ID!) {
        node(id: $id) {
          ... on GenericFile {
            id
            url
            alt
            createdAt
            fileStatus
            mimeType
            originalFileSize
          }
        }
      }
    `;

    const fullId = fileId.startsWith('gid://') 
      ? fileId 
      : `gid://shopify/GenericFile/${fileId}`;

    const response = await this.client.query({
      data: {
        query,
        variables: { id: fullId }
      }
    });

    return response.body.data?.node;
  }

  // Delete file from Shopify
  async deleteImage(fileId) {
    const mutation = `
      mutation fileDelete($fileIds: [ID!]!) {
        fileDelete(fileIds: $fileIds) {
          deletedFileIds
          userErrors {
            field
            message
          }
        }
      }
    `;

    const fullId = fileId.startsWith('gid://') 
      ? fileId 
      : `gid://shopify/GenericFile/${fileId}`;

    const response = await this.client.query({
      data: {
        query: mutation,
        variables: {
          fileIds: [fullId]
        }
      }
    });

    return response.body.data.fileDelete;
  }
}

module.exports = ImageService;
