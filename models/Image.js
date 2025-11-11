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

  // Upload image to Shopify Files API (proper CDN storage)
  async uploadImage(fileBuffer, filename, contentType) {
    try {
      console.log('Uploading file to Shopify CDN:', filename);
      
      // Step 1: Generate staged upload URL
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
              resource: "FILE",
              fileSize: fileBuffer.length.toString()
            }]
          }
        }
      });

      if (stagedResponse.body.data.stagedUploadsCreate.userErrors?.length > 0) {
        throw new Error(`Staged upload error: ${stagedResponse.body.data.stagedUploadsCreate.userErrors.map(e => e.message).join(', ')}`);
      }

      const { url, resourceUrl, parameters } = stagedResponse.body.data.stagedUploadsCreate.stagedTargets[0];
      console.log('✓ Staged upload URL generated');

      // Step 2: Upload file to Google Cloud Storage
      // Build multipart form data manually to avoid signature issues
      const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
      const parts = [];
      
      // Add all parameters from Shopify
      parameters.forEach(param => {
        parts.push(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${param.name}"\r\n\r\n` +
          `${param.value}\r\n`
        );
      });
      
      // Add file
      parts.push(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`
      );
      
      // Combine parts with file buffer
      const header = Buffer.from(parts.join(''), 'utf8');
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
      const body = Buffer.concat([header, fileBuffer, footer]);

      const uploadResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length.toString()
        },
        body: body
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`GCS upload failed (${uploadResponse.status}): ${errorText}`);
      }

      console.log('✓ File uploaded to GCS');

      // Step 3: Create file record in Shopify
      const fileCreateMutation = `
        mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files {
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
              originalSource: resourceUrl
            }]
          }
        }
      });

      if (fileResponse.body.data.fileCreate.userErrors?.length > 0) {
        throw new Error(`File create error: ${fileResponse.body.data.fileCreate.userErrors.map(e => e.message).join(', ')}`);
      }

      const file = fileResponse.body.data.fileCreate.files[0];
      console.log('✓ File created in Shopify:', file.url);

      return file;
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
