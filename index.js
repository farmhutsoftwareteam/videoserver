const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = 3000;
const videoRoutes = require('./routes/video');
const userRoutes = require('./routes/user'); // Adjust the path to your user routes file
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');




app.use(express.json());

// MongoDB connection URL
const dbURI = 'mongodb+srv://raysuncapital:ZGJKTn45yyqH6X1y@cluster0.0jein5m.mongodb.net/videoserver'; // Update this with your actual MongoDB URI

// Connect to MongoDB
mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

app.use(express.static('public'));

app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));




app.get('/', (req, res) => {
    res.send('Video server is up and running on pipelinez!');
});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
