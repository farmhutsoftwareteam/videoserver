require("dotenv").config();
const express = require("express");
const router = express.Router();
const multer = require("multer");
const supabase = require('../lib/supabase.js');
const { BlobServiceClient } = require("@azure/storage-blob");

const Video = require("../models/videoModel.js"); // Adjust the path as per your file structure

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

// Multer configuration for file uploads using memory storage
const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage for faster uploads
  limits: { fileSize: 500 * 1024 * 1024 }, // Set appropriate file size limits
});

// Helper function to upload a file to Azure Blob Storage and return the URL
async function uploadToAzure(file, containerClient) {
  const blockBlobClient = containerClient.getBlockBlobClient(file.originalname);
  
  console.log(`Uploading ${file.originalname} to container ${containerClient.containerName}...`);

  try {
    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
      onProgress: (progress) => {
        console.log(`Upload progress: ${progress.loadedBytes} bytes`);
      }
    });
  } catch (error) {
    console.error(`Error during upload: ${error.message}`);
    throw error;
  }

  return blockBlobClient.url; // Return the URL of the uploaded blob
}

// Route to upload episode information and video file
router.post('/upload-episode', upload.fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]), async (req, res) => {
  const { title, description, duration, episodenumber, seasonnumber, show } = req.body;
  const files = req.files;

  if (!title || !files.video || !files.thumbnail) {
    return res.status(400).send('Title, video file, and thumbnail are required.');
  }

  const videoFile = files.video[0];
  const thumbnailFile = files.thumbnail[0];

  try {
    const containerClient = blobServiceClient.getContainerClient("quickstart");

    // Upload video to Azure Blob Storage and get its URL
    const videoUrl = await uploadToAzure(videoFile, containerClient);
    console.log('Video uploaded successfully, URL:', videoUrl);

    // Upload thumbnail to Azure Blob Storage and get its URL
    const thumbnailUrl = await uploadToAzure(thumbnailFile, containerClient);
    console.log('Thumbnail uploaded successfully, URL:', thumbnailUrl);

    // Insert episode information into Supabase
    const { data, error } = await supabase
      .from('episodes')
      .insert([
        {
          title,
          description,
          duration,
          episodenumber,
          seasonnumber,
          show,
          thumbnail: thumbnailUrl,
          video_url: videoUrl,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      throw error;
    }

    res.status(201).json({ message: 'Episode uploaded successfully', episode: data });
  } catch (error) {
    console.error('Error uploading episode:', error.message);
    res.status(500).send('Error uploading episode.');
  }
});

module.exports = router;
