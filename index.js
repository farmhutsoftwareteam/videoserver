require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const PORT = process.env.PORT || 8080;
const videoRoutes = require("./routes/video.js");
const userRoutes = require("./routes/user.js");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-output.json");
const cors = require("cors");
const { BlobServiceClient } = require("@azure/storage-blob");

// Define CORS options
const corsOptions = {
  origin: 'https://videoadminclientside.vercel.app',
  optionsSuccessStatus: 200,
};

// Apply CORS options
app.use(cors(corsOptions));
console.log("CORS middleware applied with options:", corsOptions);

app.use(express.json());

// MongoDB connection URL
const dbURI = process.env.MONGO_DB_URI;

// Connect to MongoDB
mongoose
  .connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// Explicitly add CORS headers for specific routes
app.use("/api/videos", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://videoadminclientside.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
}, videoRoutes);

app.use("/api/users", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://videoadminclientside.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
}, userRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", (req, res) => {
  res.send("Video server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
