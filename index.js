require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 8080;
const videoRoutes = require('./routes/video');
const userRoutes = require('./routes/user'); // Adjust the path to your user routes file
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
const cors = require('cors')
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME
const { BlobServiceClient } = require("@azure/storage-blob");

const { DefaultAzureCredential } = require('@azure/identity');






app.use(cors()); 

app.use(express.json());

// MongoDB connection URL
const dbURI = 'mongodb+srv://raysuncapital:ZGJKTn45yyqH6X1y@cluster0.0jein5m.mongodb.net/videoserver'; // Update this with your actual MongoDB URI

// Connect to MongoDB
mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

  //CHECK AZURE BLOB CONNECTION
  if(!accountName){
    console.log('Azure storage account name not found');
  }
const blobServiceClient = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  new DefaultAzureCredential()
)

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
  console.log('Container listing process has been completed.');
});



app.use(express.static('public'));

app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));




app.get('/', (req, res) => {
    res.send('Video server is up and running on pipelinez! new video farmat');
});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
