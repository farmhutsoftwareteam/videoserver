const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const Video = require('../models/videoModel');  // Adjust the path as per your file structure

// Setup for handling file uploads with multer
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = 'public/videos/uploads';
            fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        }
    })
});

// POST route for video upload
router.post('/create', upload.single('video'), (req, res) => {
    const videoFile = req.file;
    const { title, description, userId, tags, access, monetization, category } = req.body;  // Extracting video metadata and monetization details from the request body

    if (!videoFile) {
        return res.status(400).send('No video file uploaded.');
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const filePath = `${baseUrl}/videos/uploads/${videoFile.filename}`;
    const thumbnailFilename = `${path.basename(videoFile.filename, path.extname(videoFile.filename))}.png`;
    const thumbnailPath = `${baseUrl}/videos/thumbnails/${thumbnailFilename}`;
    // Generate thumbnail using ffmpeg
    ffmpeg(filePath)
        .screenshots({
            timestamps: ['00:00:02'],
            filename: path.basename(thumbnailPath),
            folder: path.dirname(thumbnailPath),
            size: '320x240'
        })
        .on('end', async () => {
            try {
                // Create a new video document in the database
                const newVideo = new Video({
                    title,
                    description,
                    filePath,
                    thumbnail: thumbnailPath,
                    uploadDate: new Date(),
                    duration: 0, // This should be set based on actual video duration after processing
                    userId,
                    tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
                    access: access || 'public',  // Default to 'public' if not specified
                    monetization,
                    status: 'active',
                    category
                });

                await newVideo.save();
                res.json({
                    message: 'Video uploaded and processed successfully',
                    video: newVideo
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
