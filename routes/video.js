const express = require("express");
const multer = require("multer");
const { ContainerClient } = require("@azure/storage-blob");
const stream = require('stream');
const { promisify } = require('util');

const app = express();
const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB

const sas_url = 'https://hstvstuff.blob.core.windows.net/?sv=2022-11-02&ss=b&srt=sco&sp=rwdlaciytfx&se=2025-05-01T16:47:59Z&st=2024-07-31T08:47:59Z&spr=https,http&sig=WxcMMIafo8noK7hG5tt2IEDYayrOUDVf%2FfBT0QQCTBU%3D';

const storage = multer.memoryStorage();
const upload = multer({ storage });

// To parse json request body


async function uploadChunk(blockBlobClient, chunk, index) {
    const blockId = Buffer.from(String(index).padStart(6, '0')).toString('base64');
    const chunkStream = new stream.PassThrough();
    chunkStream.end(chunk);

    const options = {
        headers: {
            'x-ms-date': new Date().toUTCString(),
            'x-ms-version': '2021-04-10' // Corrected version
        }
    };

    await blockBlobClient.stageBlock(blockId, chunkStream, chunk.length, options);
    return blockId;
}

async function commitBlockList(blockBlobClient, blockIds) {
    const options = {
        headers: {
            'x-ms-date': new Date().toUTCString(),
            'x-ms-version': '2021-04-10' // Corrected version
        }
    };

    await blockBlobClient.commitBlockList(blockIds.map(id => id), options);
}

app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const container = req.body.container === '2' ? 'videos' : 'thumbnails';
        const blobName = file.originalname;

        // Construct the container URL dynamically
        const containerUrl = `https://hstvstuff.blob.core.windows.net/${container}?${sas_url.split('?')[1]}`;
        const containerClient = new ContainerClient(containerUrl);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const chunks = [];
        for (let i = 0; i < file.buffer.length; i += CHUNK_SIZE) {
            chunks.push(file.buffer.slice(i, i + CHUNK_SIZE));
        }

        const blockIds = await Promise.all(chunks.map((chunk, index) => uploadChunk(blockBlobClient, chunk, index)));
        await commitBlockList(blockBlobClient, blockIds);

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
