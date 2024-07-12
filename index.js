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

app.use(cors());
app.use(express.json());

// MongoDB connection URL
const dbURI = process.env.MONGO_DB_URI;

// Connect to MongoDB
mongoose
  .connect(dbURI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// Use routes
app.use("/api/videos", videoRoutes);
app.use("/api/users", userRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", (req, res) => {
  res.send("Video server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
