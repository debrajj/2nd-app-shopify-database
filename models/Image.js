// Image metadata stored in Shopify metaobjects
// This module provides helper functions for managing image data in Shopify

const shopify = require('../config/shopify');

class ImageService {
  constructor(session) {
    this.session = session;
    this.client = new shopify.clients.Graphql({ session });
  }

  // Upload image to Shopify Files API
  async uploadImage(fileBuffer, filename, contentType) {
    try {
      const stagedUploadMutation = `
        mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
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

      // Step 1: Create staged upload
      console.log('Step 1: Creating staged upload...');
      const stagedResponse = await this.client.query({
        data: {
          query: stagedUploadMutation,
          variables: {
            input: [{
              filename: filename,
              mimeType: contentType,
              resource: "FILE",
              fileSize: fileBuffer.length.toString()
            }]
          }
        }
      });

      if (stagedResponse.body.data.stagedUploadsCreate.userErrors?.length > 0) {
        const errors = stagedResponse.body.data.stagedUploadsCreate.userErrors;
        throw new Error(`Staged upload error: ${errors.map(e => e.message).join(', ')}`);
      }

      const stagedTarget = stagedResponse.body.data.stagedUploadsCreate.stagedTargets[0];
      console.log('✓ Staged upload created:', stagedTarget.resourceUrl);
      
      // Step 2: Upload file to staged URL
      console.log('Step 2: Uploading file to staged URL...');
      const FormData = require('form-data');
      const fetch = require('node-fetch');
      
      const formData = new FormData();
      
      // Add parameters in the correct order
      stagedTarget.parameters.forEach(param => {
        formData.append(param.name, param.value);
      });
      
      // Add file last
      formData.append('file', fileBuffer, { 
        filename: filename,
        contentType: contentType
      });

      const uploadResponse = await fetch(stagedTarget.url, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`File upload to staged URL failed: ${uploadResponse.status} - ${errorText}`);
      }

      console.log('✓ File uploaded to staged URL');

      // Step 3: Create file in Shopify
      console.log('Step 3: Creating file record in Shopify...');
      const fileCreateMutation = `
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

      const fileResponse = await this.client.query({
        data: {
          query: fileCreateMutation,
          variables: {
            files: [{
              alt: filename,
              contentType: "FILE",
              originalSource: stagedTarget.resourceUrl
            }]
          }
        }
      });

      if (fileResponse.body.data.fileCreate.userErrors?.length > 0) {
        const errors = fileResponse.body.data.fileCreate.userErrors;
        throw new Error(`File create error: ${errors.map(e => e.message).join(', ')}`);
      }

      const createdFile = fileResponse.body.data.fileCreate.files[0];
      console.log('✓ File created in Shopify:', createdFile.id);

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
