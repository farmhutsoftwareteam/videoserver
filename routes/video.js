const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const Video = require('../models/videoModel');  // Adjust the path as per your file structure

const uploadPath = path.join(__dirname, '../public/videos/uploads');
const thumbnailDir = path.join(__dirname, '../public/videos/thumbnails');




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


// POST route for video uploadd
// POST route for video upload with user-provided thumbnail
router.post('/create', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
    const videoFile = req.files['video'][0];
    const thumbnailFile = req.files['thumbnail'][0];
  
    // Check if the video and thumbnail files were received
    if (!videoFile || !thumbnailFile) {
      return res.status(400).send('Video and thumbnail files are required.');
    }
  
    // Extract video metadata from the request body
    const { title, description, userId, tags, access, monetization, category } = req.body;
  
    // Define the local file paths on the server's filesystem
    const videoFilePath = path.join(uploadPath, videoFile.filename);
    const thumbnailFilePath = path.join(thumbnailDir, thumbnailFile.filename);
  
    try {
      // Create a new video document in the database
      const newVideo = new Video({
        title,
        description,
        filePath: videoFile.filename,
        thumbnail: thumbnailFile.filename,
        uploadDate: new Date(),
        duration: 0, // Set based on actual video duration if needed
        userId,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        access: access || 'public',
        monetization,
        status: 'active',
        category
      });
      await newVideo.save();
  
      // Respond with success message and video document
      res.json({
        message: 'Video uploaded successfully',
        video: {
          ...newVideo.toObject(),
          videoUrl: `${req.protocol}://${req.get('host')}/videos/uploads/${newVideo.filePath}`,
          thumbnailUrl: `${req.protocol}://${req.get('host')}/videos/thumbnails/${newVideo.thumbnail}`
        }
      });
    } catch (error) {
      console.error('Error saving video:', error);
      res.status(500).send('Error processing video');
    }
  });
  



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
        let videos = await Video.find({});
        // Construct full URLs for each video
        videos = videos.map(video => ({
          ...video.toObject(),
          filePath: constructVideoUrl(req, video.filePath , 'video'),
          thumbnail: constructVideoUrl(req, video.thumbnail ,'thumbnail')
        }));
        res.json(videos);
    } catch (error) {
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
