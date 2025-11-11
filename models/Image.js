// Image metadata stored in Shopify metaobjects
// This module provides helper functions for managing image data in Shopify

const shopify = require('../config/shopify');
const fetch = require('node-fetch');

class ImageService {
  constructor(session) {
    this.session = session;
    this.client = new shopify.clients.Graphql({ session });
    this.restClient = new shopify.clients.Rest({ session });
  }

  // Upload image to Shopify using Metafields (simpler approach)
  async uploadImage(fileBuffer, filename, contentType) {
    try {
      console.log('Uploading file to Shopify:', filename);
      
      // Convert buffer to base64
      const base64Data = fileBuffer.toString('base64');
      const dataUrl = `data:${contentType};base64,${base64Data}`;
      
      // Use GraphQL to create a file with base64 data
      const mutation = `
        mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files {
              id
              alt
              createdAt
              fileStatus
              ... on GenericFile {
                url
                mimeType
                originalFileSize
              }
            }
            userErrors {
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
            files: [{
              alt: filename,
              contentType: "FILE",
              originalSource: dataUrl
            }]
          }
        }
      });

      if (response.body.data.fileCreate.userErrors?.length > 0) {
        const errors = response.body.data.fileCreate.userErrors;
        throw new Error(`File upload error: ${errors.map(e => e.message).join(', ')}`);
      }

      const createdFile = response.body.data.fileCreate.files[0];
      console.log('✓ File uploaded to Shopify:', createdFile.id);

      return createdFile;
    } catch (error) {
      console.error('Upload error details:', error);
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
              id
              alt
              createdAt
              fileStatus
              ... on GenericFile {
                url
                mimeType
                originalFileSize
              }
            }
          }
        }
      }
    `;

    const response = await this.client.query({
      data: { query }
    });

    return response.body.data.files.edges.map(edge => edge.node);
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
            mimeType
            originalFileSize
            createdAt
          }
        }
      }
    `;

    const response = await this.client.query({
      data: {
        query,
        variables: { id: fileId }
      }
    });

    return response.body.data.node;
  }

  // Delete file from Shopify
  async deleteImage(fileId) {
    const mutation = `
      mutation fileDelete($input: [ID!]!) {
        fileDelete(fileIds: $input) {
          deletedFileIds
          userErrors {
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
          input: [fileId]
        }
      }
    });

    return response.body.data.fileDelete;
  }
}

module.exports = ImageService;
