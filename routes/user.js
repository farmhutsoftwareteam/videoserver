const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');  // Adjust the path to where your User model is located

// POST route to create a new user
/**
 * @swagger
 * /videos/create:
 *   post:
 *     summary: Uploads a video file.
 *     description: This route allows for uploading a video to the server.
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: video
 *         type: file
 *         description: The file to upload.
 *       - in: formData
 *         name: title
 *         type: string
 *         description: The title of the video.
 *       - in: formData
 *         name: description
 *         type: string
 *         description: The description of the video.
 *     responses:
 *       200:
 *         description: Successfully uploaded
 *         schema:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *             video:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 filePath:
 *                   type: string
 */
router.post('/', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            password: hashedPassword
        });
        await user.save();
        res.status(201).json({ message: 'User created successfully', userId: user._id });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
});

// GET route to fetch all users
router.get('/', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

// PUT route to update a user
router.put('/:userId', async (req, res) => {
    const { userId } = req.params;
    const updateData = req.body;

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
});

// DELETE route to delete a user
router.delete('/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        await User.findByIdAndDelete(userId);
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
});

module.exports = router;
