# Video Server Application

This Video Server application is designed to facilitate the storage and retrieval of video content. It leverages MongoDB for user management and Azure Blob Storage for storing the video files, providing a robust and scalable solution for video content management.

## Features

- User Authentication: Secure login and registration functionality for users.
- Video Upload: Allows users to upload videos to Azure Blob Storage.
- Video Retrieval: Users can fetch the list of their uploaded videos.
- Scalable Storage: Utilizes Azure Blob Storage for scalable and secure video file storage.

## Getting Started

To get started with this application, you will need to set up MongoDB, Azure Blob Storage, and Supabase. Follow the steps below to configure your environment.

### Prerequisites

- Node.js installed on your machine.
- An Azure account with an active subscription.
- A MongoDB database.
- Docker

### Setting Up MongoDB

1. Create a MongoDB database and obtain your connection string.
2. Update the `.env` file with your MongoDB connection string as shown below:


   MONGO_DB_URI="your_mongodb_connection_string_here"


### Setting Up Azure Blob Storage

1. Create an Azure Blob Storage account through the Azure Portal.
2. Obtain your storage account name and connection string.
3. Update the `.env` file with your Azure Blob Storage details:


   AZURE_STORAGE_ACCOUNT_NAME='your_storage_account_name_here'

   AZURE_STORAGE_CONNECTION_STRING='your_storage_connection_string_here'


### Environment Variables

Create a `.env` file in the root of your project and update it with the necessary details as mentioned above. You can use the `.env.example` as a template:


cp .env.example .env


### Running the Application

1. Install the dependencies:


   npm install

3. Initialize Supabase

    npx supabse init
    npx supabase start

2. Start the server:
 
   npm start


   Alternatively, if you're using nodemon for development:

   npm run dev


3. The server will start on the port specified in your `.env` file, or 8080 by default. You can access the API at `http://localhost:8080`.

### API Documentation

Access the Swagger UI for the API documentation by navigating to `http://localhost:8080/api-docs` in your web browser. This documentation provides detailed information about the available endpoints, request parameters, and response structures.

### Contributing

Contributions are welcome! Please fork the repository and submit pull requests with any enhancements, bug fixes, or suggestions.

### License

Specify the license under which your project is made available. Common licenses for open source projects include MIT, GPL, and Apache 2.0.
