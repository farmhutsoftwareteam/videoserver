# Use the official Node.js 14 image as a parent image
FROM node:20

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg

# Set the working directory to /usr/src/app
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Bundle the app source inside the Docker image
COPY . .

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Define the command to run the app using CMD which defines your runtime
CMD ["node", "index.js"]
