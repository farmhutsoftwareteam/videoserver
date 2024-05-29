require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const PORT = process.env.PORT || 8080;
const videoRoutes = require("./routes/video.js");
const userRoutes = require("./routes/user.js"); // Adjust the path to your user routes file
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-output.json");
const cors = require("cors");
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const { BlobServiceClient } = require("@azure/storage-blob");
const paynow = require("./routes/payment.js");
const { DefaultAzureCredential } = require("@azure/identity");

app.use(cors());

app.use(express.json());

// MongoDB connection URL
const dbURI = process.env.MONGO_DB_URI;

// Connect to MongoDB
mongoose
  .connect(dbURI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

const AZURE_STORAGE_CONNECTION_STRING =
  process.env.AZURE_STORAGE_CONNECTION_STRING;

// Create the BlobServiceClient object with connection string
const blobServiceClient = BlobServiceClient.fromConnectionString(
  AZURE_STORAGE_CONNECTION_STRING
);

// Assuming BlobServiceClient is already initialized as blobServiceClient

async function listContainers() {
  console.log("Listing containers in the account:");

  try {
    // This method returns an async iterable iterator that you can use to iterate over the containers
    for await (const container of blobServiceClient.listContainers()) {
      console.log(`\tContainer Name: ${container.name}`);
    }
  } catch (error) {
    console.error("Error listing containers:", error.message);
  }
}

// Call the listContainers function
listContainers().then(() => {
  console.log("Container listing process has been completed.");
});

app.use(express.static("public"));

app.use("/api/videos", videoRoutes);
app.use("/api/users", userRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api", paynow); // Add the payment routes

app.get("/", (req, res) => {
  res.send("Video server is up and running on pipelinez! new video farmat with supabase now");
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
