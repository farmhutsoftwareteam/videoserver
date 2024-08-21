const express = require("express");
const { BlobServiceClient, BaseRequestPolicy, newPipeline, StorageSharedKeyCredential, BlobSASPermissions } = require("@azure/storage-blob");

const app = express();

class RequestIDPolicyFactory {
    prefix;
    constructor(prefix) {
      this.prefix = prefix;
    }
  
    create(nextPolicy, options) {
      return new RequestIDPolicy(nextPolicy, options, this.prefix);
    }
  }
  
  class RequestIDPolicy extends BaseRequestPolicy {
    prefix;
    constructor(nextPolicy, options, prefix) {
      super(nextPolicy, options);
      this.prefix = prefix;
    }
  
    async sendRequest(request) {

      request.headers.set(
        'x-ms-date', new Date().toUTCString()
      );

      request.headers.set('x-ms-version', '2021-04-10')
  
      const response = await this._nextPolicy.sendRequest(request);
  
      return response;
    }
  }

// To parse json request body

app.post('/upload', async (req, res) => {
    try {
        console.log('Running new version...')
        const fileName = req.body.fileName;
        if (!fileName) {
            return res.status(400).json({ error: 'Please specify a file name!' });
        }

        const container = req.body.container === '2' ? 'videos' : 'thumbnails';
        const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME

        const sharedKeyCredential = new StorageSharedKeyCredential(storageAccountName, process.env.AZURE_STORAGE_ACCOUNT_KEY)

        const pipeline = newPipeline(sharedKeyCredential)

        pipeline.factories.unshift(new RequestIDPolicyFactory('Prefix'))

        const blobServiceClient = new BlobServiceClient(
            `https://${storageAccountName}.blob.core.windows.net`, pipeline)

        const containerClient = blobServiceClient.getContainerClient(container);
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);

        const expiresOnDate = new Date();
        expiresOnDate.setMinutes(expiresOnDate.getMinutes() + 60); // 1 hour

        const sasUrl = await blockBlobClient.generateSasUrl({permissions: BlobSASPermissions.parse('rw'), expiresOn: expiresOnDate, version: '2021-04-10' })

        res.status(200).json({ url: sasUrl });
    } catch (error) {
        console.error('Error uploading file to Azure:', error);
        res.status(500).json({ error: 'Error uploading file to Azure', details: error.message });
    }
});

// Testing
app.get('/test', (req, res) => {
    res.send("Demo Chunk Application Running Successfully...");
});

module.exports = app;
