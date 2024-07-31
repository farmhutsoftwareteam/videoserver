require('dotenv').config();
const express = require('express');
const { BlobServiceClient, BlockBlobClient } = require('@azure/storage-blob');
const multer = require('multer');
const stream = require('stream');

const router = express.Router();

const sas_url = 'https://hstvstuff.blob.core.windows.net/?sv=2022-11-02&ss=b&srt=sco&sp=rwdlaciytfx&se=2025-05-01T16:47:59Z&st=2024-07-31T08:47:59Z&spr=https,http&sig=WxcMMIafo8noK7hG5tt2IEDYayrOUDVf%2FfBT0QQCTBU%3D';

const blobServiceClient = new BlobServiceClient(sas_url);

const containerClient1 = blobServiceClient.getContainerClient('thumbnails');
const containerClient2 = blobServiceClient.getContainerClient('videos');

// Custom storage engine for Multer
const azureStorage = multer.memoryStorage();
const upload = multer({ storage: azureStorage });

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

    // Create a stream from the file buffer
    const bufferStream = new stream.PassThrough();
    bufferStream.end(file.buffer);

    // Optimize upload using parallel uploads
    const uploadOptions = {
      bufferSize: 8 * 1024 * 1024, // 8MB buffer size
      maxBuffers: 50 // 50 parallel uploads
    };

    // Upload stream to Azure Blob Storage with parallel upload options
    await blockBlobClient.uploadStream(bufferStream, uploadOptions.bufferSize, uploadOptions.maxBuffers);

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

