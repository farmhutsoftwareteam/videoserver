const express = require("express");
const multer = require("multer");
const { BlobServiceClient } = require("@azure/storage-blob");

const app = express();


const storage = multer.memoryStorage();
const upload = multer({ storage });

// To parse json request body

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const container = req.body.container === '2' ? 'videos' : 'thumbnails';
        const blobName = file.originalname;

        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
        const containerClient = blobServiceClient.getContainerClient(container);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadData(req.file.buffer, { blobHTTPHeaders: { blobContentType: req.file.mimetype }, onProgress: (ev) => console.log(ev) })

        res.status(200).json({ message: 'File uploaded successfully', url: blockBlobClient.url });
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
