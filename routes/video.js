require("dotenv").config();
const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const supabase = require('../lib/supabase.js');

const { BlobServiceClient, ContainerClient } = require("@azure/storage-blob");

const Video = require("../models/videoModel.js"); // Adjust the path as per your file structure

const uploadPath = path.join(__dirname, "../public/videos/uploads");
const thumbnailDir = path.join(__dirname, "../public/videos/thumbnails");
const containerName = "quickstart";

const AZURE_STORAGE_CONNECTION_STRING =
  process.env.AZURE_STORAGE_CONNECTION_STRING;

const blobServiceClient = BlobServiceClient.fromConnectionString(
  AZURE_STORAGE_CONNECTION_STRING
);

const constructVideoUrl = (req, filePath, type) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  let basePath = "/videos";
  if (type === "video") {
    basePath += "/uploads";
  } else if (type === "thumbnail") {
    basePath += "/thumbnails";
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
      if (file.fieldname === "thumbnail") {
        cb(null, thumbnailDir); // Save thumbnails in the thumbnails folder
      } else {
        cb(null, uploadPath); // Save videos in the uploads folder
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
    },
  }),
});

// Route to upload a video and its thumbnail, along with other metadata
router.post(
  "/upload-video",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files;
    if (!files.video || !files.thumbnail) {
      return res
        .status(400)
        .send("Both video and thumbnail files are required.");
    }

    const videoFile = files.video[0];
    const thumbnailFile = files.thumbnail[0];

    // Extract additional fields from the request body
    const { title, description, userId, tags, access, monetization, category } =
      req.body;

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
        tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
        access,
        monetization,
        category,
        filePath: videoUrl, // Use the URL from the uploaded video
        thumbnail: thumbnailUrl, // Use the URL from the uploaded thumbnail
        uploadDate: new Date(),
        // Initialize other fields as needed, e.g., views, status, etc.
        views: 0, // Default value if not provided
        status: "active", // Default value if not provided
        // Add other fields as necessary
      });

      await newVideo.save();

      // Optionally, delete the local files after upload
      fs.unlinkSync(videoFile.path);
      fs.unlinkSync(thumbnailFile.path);

      res.json({
        message: "Video uploaded successfully",
        video: newVideo,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error uploading video and metadata.");
    }
  }
);


// Helper function to upload a file to Azure Blob Storage and return the URL
async function uploadBlob(file) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(file.originalname);
  console.log(
    `Uploading ${file.originalname} to container ${containerName}...`
  );
  await blockBlobClient.uploadFile(file.path);
  return blockBlobClient.url; // Return the URL of the uploaded blob
}

// Route to upload episode information and video file
router.post('/upload-episode', upload.single('video'), async (req, res) => {
  const { title, description, duration, episodenumber, seasonnumber, show, thumbnail } = req.body;
  const videoFile = req.file;

  if (!title || !videoFile) {
    return res.status(400).send('Title and video file are required.');
  }

  try {
    // Upload video to Azure Blob Storage and get its URL
    const videoUrl = await uploadBlob(videoFile);

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
          thumbnail,
          video_url: videoUrl,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      throw error;
    }

    // Optionally, delete the local video file after upload
    fs.unlinkSync(videoFile.path);

    res.status(201).json({ message: 'Episode uploaded successfully', episode: data });
  } catch (error) {
    console.error('Error uploading episode:', error);
    res.status(500).send('Error uploading episode.');
  }
});

// GET route to fetch a specific video by ID
router.get("/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).send("Video not found");
    }
    res.json(video);
  } catch (error) {
    console.error("Error fetching video:", error);
    res.status(500).send("Error fetching video");
  }
});
// PUT route to update video details
router.put("/:id", async (req, res) => {
  try {
    const updatedVideo = await Video.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedVideo);
  } catch (error) {
    res.status(500).send("Error updating video");
  }
});

// DELETE route to remove a video
router.delete("/:id", async (req, res) => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    res.send("Video deleted successfully");
  } catch (error) {
    res.status(500).send("Error deleting video");
  }
});
// GET route to fetch all videos
router.get("/", async (req, res) => {
  try {
    const videos = await Video.find({});
    res.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).send("Error fetching videos");
  }
});

// GET route to fetch videos by category
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const videosInCategory = await Video.find({
      category: category,
      status: "active",
    });

    if (videosInCategory.length === 0) {
      return res.status(404).send("No videos found in this category");
    }

    res.json(videosInCategory);
  } catch (error) {
    console.error("Error fetching videos by category:", error);
    res.status(500).send("Error fetching videos");
  }
});



module.exports = router;
