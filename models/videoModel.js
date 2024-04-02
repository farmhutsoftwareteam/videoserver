const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: false },
  filePath: { type: String, required: true },  // Adapt based on storage strategy
  thumbnail: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
  duration: { type: Number, required: false },
  tags: [String],
  views: { type: Number, default: 0 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  access: { type: String, enum: ['public', 'private', 'unlisted'], default: 'public' },
  status: { type: String, enum: ['active', 'processing', 'deleted'], default: 'active' },
  category: { type: String},  // Single category for each video

  resolutions: [
    {
      quality: String,
      filePath: String
    }
  ],
  formats: [
    {
      type: String,
      filePath: String
    }
  ],
  subtitles: [
    {
      language: String,
      filePath: String
    }
  ],
  interactiveElements: [
    {
      time: Number,
      action: String,
      metadata: mongoose.Schema.Types.Mixed
    }
  ],
  analytics: {
    playCount: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 }
  },
  monetization: {
    type: { type: String, enum: ['free', 'pay-per-view', 'subscription'], default: 'free' },
    details: mongoose.Schema.Types.Mixed
  },
  relatedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }]
});

const Video = mongoose.model('Video', videoSchema);

module.exports = Video;
