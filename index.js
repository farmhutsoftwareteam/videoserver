require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 8080;
const videoRoutes = require('./routes/video.js');
const userRoutes = require('./routes/user.js');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
const cors = require('cors');
const paymentRoutes = require('./routes/payment.js')
const searchRouter = require('./routes/search');

// Apply CORS options
app.use(cors());

// Use JSON middleware
app.use(express.json());

// MongoDB connection URL
const dbURI = 'mongodb+srv://raysuncapital:ZGJKTn45yyqH6X1y@cluster0.0jein5m.mongodb.net/videoserver'
mongoose.connect(dbURI, {})
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// Increase request timeout for large file uploads
app.use((req, res, next) => {
  req.setTimeout(0); // No timeout
  res.setTimeout(0); // No timeout
  next();
});

app.use(express.json());

// Routes
app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);
app.use('/api', searchRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use ('/api' , paymentRoutes)

app.get('/', (req, res) => {
  res.send("Video server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

module.exports = app;
