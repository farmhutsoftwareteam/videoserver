const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const blobServiceClient = new BlobServiceClient(
  'https://hstv.blob.core.windows.net?sv=2022-11-02&ss=bfqt&srt=o&sp=rwdlacupiytfx&se=2025-12-07T17:17:30Z&st=2024-07-12T09:17:30Z&spr=https&sig=mj188XaUBx9L3Qfw6xOpaSfBhdDrbygW%2F3ZU5P41Xbk%3D'
);
const containerClient1 = blobServiceClient.getContainerClient('thumbnails');
const containerClient2 = blobServiceClient.getContainerClient('videos');

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    console.log('Uploaded file:', file);

    const container = req.body.container === '2' ? containerClient2 : containerClient1;
    const blobName = file.filename;
    const blockBlobClient = container.getBlockBlobClient(blobName);

    await blockBlobClient.uploadFile(file.path);
    fs.unlinkSync(path.resolve(file.path)); // Delete file from server after upload

    const fileURL = blockBlobClient.url; // Get the file URL
    res.status(200).json({ message: 'File uploaded successfully', url: fileURL });
  } catch (uploadError) {
    console.error('Error uploading file to Azure:', uploadError);
    res.status(500).json({ error: 'Error uploading file to Azure', details: uploadError.message });
  }
});

module.exports = router;
