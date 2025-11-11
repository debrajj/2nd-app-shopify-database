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

    // Create staged upload
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

    const stagedTarget = stagedResponse.body.data.stagedUploadsCreate.stagedTargets[0];
    
    // Upload file to staged URL
    const FormData = require('form-data');
    const fetch = require('node-fetch');
    
    const formData = new FormData();
    stagedTarget.parameters.forEach(param => {
      formData.append(param.name, param.value);
    });
    formData.append('file', fileBuffer, { filename, contentType });

    await fetch(stagedTarget.url, {
      method: 'POST',
      body: formData
    });

    // Create file in Shopify
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

    return fileResponse.body.data.fileCreate.files[0];
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
