const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const Video = require('../models/videoModel');  // Adjust the path as per your file structure

const uploadPath = path.join(__dirname, '../public/videos/uploads');
const thumbnailDir = path.join(__dirname, '../public/videos/thumbnails');

// Ensure the directories exist
fs.mkdirSync(uploadPath, { recursive: true });
fs.mkdirSync(thumbnailDir, { recursive: true });

// Multer configuration for file uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    })
});


// POST route for video upload
router.post('/create', upload.single('video'), (req, res) => {
    const videoFile = req.file;

    // Check if the video file was received
    if (!videoFile) {
        return res.status(400).send('No video file uploaded.');
    }

    // Extract video metadata from the request body
    const { title, description, userId, tags, access, monetization, category } = req.body;

    // Define the local file paths on the server's filesystem
    const videoFilePath = path.join(uploadPath, videoFile.filename);
    const thumbnailFilename = path.basename(videoFile.filename, path.extname(videoFile.filename)) + '.png';
    const thumbnailFilePath = path.join(thumbnailDir, thumbnailFilename);

    // Generate thumbnail using ffmpeg
    ffmpeg(videoFilePath)
        .screenshots({
            timestamps: ['00:00:02'],
            filename: thumbnailFilename,
            folder: thumbnailDir,
            size: '320x240'
        })
        .on('end', async () => {
            try {
                // Create a new video document in the database
                const newVideo = new Video({
                    title,
                    description,
                    filePath: videoFile.filename,  // Saving the filename only, to construct URLs dynamically later
                    thumbnail: thumbnailFilename,  // Saving the filename only, to construct URLs dynamically later
                    uploadDate: new Date(),
                    duration: 0,  // This should be set based on the actual video duration after processing
                    userId,
                    tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
                    access: access || 'public',  // Default to 'public' if not specified
                    monetization,
                    status: 'active',
                    category
                });
            await newVideo.save();

            // Construct the URLs for the video and thumbnail
            const baseUrl = `${req.protocol}://${req.get('host')}`;
                const videoUrl = `${baseUrl}/videos/uploads/${newVideo.filePath}`;
                const thumbnailUrl = `${baseUrl}/videos/thumbnails/${newVideo.thumbnail}`;


            // Respond with success message and video document
            res.json({
                message: 'Video uploaded and processed successfully',
                video: {
                    ...newVideo.toObject(), // Spread the video document data
                    videoUrl,
                    thumbnailUrl
                }
            });
        } catch (error) {
            console.error('Error saving video:', error);
            res.status(500).send('Error processing video');
        }
    })
    .on('error', (err) => {
        console.error('Error generating thumbnail:', err);
        res.status(500).send('Error processing video');
    });
});



// GET route to fetch a specific video by ID
router.get('/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        res.json(video);
    } catch (error) {
        res.status(404).send('Video not found');
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
        res.status(500).send('Error fetching videos');
    }
});


module.exports = router;
