const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');  // Adjust the path to where your User model is located
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


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

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User does not exist' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Wrong password' });
        }

        const token = jwt.sign({ id: user._id }, 'your_secret_key', { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).send('Server error');
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
