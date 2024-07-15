require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const blobServiceClient = new BlobServiceClient(process.env.AZURE_STORAGE_SAS_URL);
const containerClient1 = blobServiceClient.getContainerClient('thumbnails');
const containerClient2 = blobServiceClient.getContainerClient('videos');

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Uploaded file:', file);

    const container = req.body.container === '2' ? containerClient2 : containerClient1;
    const blobName = file.originalname; // Use the original file name
    const blockBlobClient = container.getBlockBlobClient(blobName);

    // Upload file to Azure Blob Storage
    await blockBlobClient.uploadFile(file.path);

    // Delete file from the server after upload
    fs.unlinkSync(path.resolve(file.path));

    // Construct the actual file URL
    const containerBaseUrl = container.url.split('?')[0]; // Get the base URL without SAS token
    const fileURL = `${containerBaseUrl}/${blobName}`;

    res.status(200).json({ message: 'File uploaded successfully', url: fileURL });
  } catch (uploadError) {
    console.error('Error uploading file to Azure:', uploadError);
    res.status(500).json({ error: 'Error uploading file to Azure', details: uploadError.message });
  }
});

module.exports = router;
