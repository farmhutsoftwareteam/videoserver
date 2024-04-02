const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME
const { BlobServiceClient, ContainerClient } = require("@azure/storage-blob");

const { DefaultAzureCredential } = require('@azure/identity');




const Video = require('../models/videoModel');  // Adjust the path as per your file structure

const uploadPath = path.join(__dirname, '../public/videos/uploads');
const thumbnailDir = path.join(__dirname, '../public/videos/thumbnails');
const containerName = 'quickstart';



const blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    new DefaultAzureCredential()
  )





const constructVideoUrl = (req, filePath, type) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    let basePath = '/videos';
    if (type === 'video') {
        basePath += '/uploads';
    } else if (type === 'thumbnail') {
        basePath += '/thumbnails';
    }
    // Ensure there's no slash between the base URL and the file path
    return `${baseUrl}${basePath}/${path.basename(filePath)}`;
};



// Ensure the directories exist
fs.mkdirSync(uploadPath, { recursive: true });
fs.mkdirSync(thumbnailDir, { recursive: true });

// Multer configuration for file uploads
// Multer configuration for file uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            // Check if the file is a video or a thumbnail
            if (file.fieldname === 'thumbnail') {
                cb(null, thumbnailDir); // Save thumbnails in the thumbnails folder
            } else {
                cb(null, uploadPath); // Save videos in the uploads folder
            }
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    })
});


// Route to upload a video and its thumbnail, along with other metadata
router.post('/upload-video', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
    const files = req.files;
    if (!files.video || !files.thumbnail) {
      return res.status(400).send('Both video and thumbnail files are required.');
    }
  
    const videoFile = files.video[0];
    const thumbnailFile = files.thumbnail[0];
  
    // Extract additional fields from the request body
    const { title, description, userId, tags, access, monetization, category } = req.body;
  
    try {
      // Upload video and get its URL
      const videoUrl = await uploadBlob(videoFile);
  
      // Upload thumbnail and get its URL
      const thumbnailUrl = await uploadBlob(thumbnailFile);
  
      // Create a new video document in the database
      const newVideo = new Video({
        title,
        description,
        userId,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        access,
        monetization,
        category,
        filePath: videoUrl, // Use the URL from the uploaded video
        thumbnail: thumbnailUrl, // Use the URL from the uploaded thumbnail
        uploadDate: new Date(),
        // Initialize other fields as needed, e.g., views, status, etc.
        views: 0, // Default value if not provided
        status: 'active', // Default value if not provided
        // Add other fields as necessary
      });
  
      await newVideo.save();
  
      // Optionally, delete the local files after upload
      fs.unlinkSync(videoFile.path);
      fs.unlinkSync(thumbnailFile.path);
  
      res.json({
        message: 'Video uploaded successfully',
        video: newVideo
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error uploading video and metadata.');
    }
});

  // Helper function to upload a file to Azure Blob Storage and return the URL
async function uploadBlob(file) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(file.originalname);
    console.log(`Uploading ${file.originalname} to container ${containerName}...`);
    await blockBlobClient.uploadFile(file.path);
    return blockBlobClient.url; // Return the URL of the uploaded blob
  }
  



// GET route to fetch a specific video by ID
router.get('/:id', async (req, res) => {
    try {
        const videoData = await Video.findById(req.params.id);
        if (!videoData) {
            return res.status(404).send('Video not found');
        }
        
        const video = {
            ...videoData.toObject(),
            filePath: constructVideoUrl(req, videoData.filePath ,'video'),
            thumbnail: constructVideoUrl(req, videoData.thumbnail ,'thumbnail')
        };

        // Find related videos
        let relatedVideos = await Video.aggregate([
            {
                $match: {
                    _id: { $ne: videoData._id }, // Exclude the current video
                    tags: { $in: videoData.tags } // Find videos with any matching tag
                }
            },
            {
                $addFields: {
                    commonTags: {
                        $size: {
                            $setIntersection: ["$tags", videoData.tags]
                        }
                    }
                }
            },
            {
                $match: {
                    commonTags: { $gte: 3 } // Ensure at least 3 tags are common
                }
            },
            { $limit: 10 } // Limit the number of related videos returned
        ]);

        // Transform related videos to include constructed URLs
        relatedVideos = relatedVideos.map(rv => ({
            ...rv,
            filePath: constructVideoUrl(req, rv.filePath, 'video'),
            thumbnail: constructVideoUrl(req, rv.thumbnail , 'thumbnail')
        }));

        res.json({ video, relatedVideos });
    } catch (error) {
        console.error('Error fetching video and related videos:', error);
        res.status(500).send('Error fetching videos');
    }
});

// PUT route to update video details
router.put('/:id', async (req, res) => {
    try {
        const updatedVideo = await Video.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedVideo);
    } catch (error) {
        res.status(500).send('Error updating video');
    }
});

// DELETE route to remove a video
router.delete('/:id', async (req, res) => {
    try {
        await Video.findByIdAndDelete(req.params.id);
        res.send('Video deleted successfully');
    } catch (error) {
        res.status(500).send('Error deleting video');
    }
});
// GET route to fetch all videos
router.get('/', async (req, res) => {
    try {
        const videos = await Video.find({});
        res.json(videos);
    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).send('Error fetching videos');
    }
});


// GET route to fetch videos by category
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const videosInCategory = await Video.find({ category: category, status: 'active' });

        if (videosInCategory.length === 0) {
            return res.status(404).send('No videos found in this category');
        }

        res.json(videosInCategory);
    } catch (error) {
        console.error('Error fetching videos by category:', error);
        res.status(500).send('Error fetching videos');
    }
});


module.exports = router;
