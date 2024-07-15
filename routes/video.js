const express = require('express');
const Busboy = require('busboy');
const { BlobServiceClient } = require('@azure/storage-blob');
const stream = require('stream');

const router = express.Router();

const blobServiceClient = new BlobServiceClient(
  'https://hstv.blob.core.windows.net?sv=2022-11-02&ss=bfqt&srt=o&sp=rwdlacupiytfx&se=2025-12-07T17:17:30Z&st=2024-07-12T09:17:30Z&spr=https&sig=mj188XaUBx9L3Qfw6xOpaSfBhdDrbygW%2F3ZU5P41Xbk%3D'
);
const containerClient1 = blobServiceClient.getContainerClient('thumbnails');
const containerClient2 = blobServiceClient.getContainerClient('videos');

router.post('/upload', (req, res) => {
  const busboy = new Busboy({ headers: req.headers });

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    const container = req.body.container === '2' ? containerClient2 : containerClient1;
    const blockBlobClient = container.getBlockBlobClient(filename);

    const uploadStream = blockBlobClient.createWriteStream({
      blobHTTPHeaders: { blobContentType: mimetype }
    });

    file.pipe(uploadStream);

    uploadStream.on('finish', () => {
      res.status(200).json({ message: 'File uploaded successfully', url: blockBlobClient.url });
    });

    uploadStream.on('error', (err) => {
      res.status(500).json({ error: 'Error uploading file to Azure', details: err.message });
    });
  });

  req.pipe(busboy);
});

module.exports = router;
