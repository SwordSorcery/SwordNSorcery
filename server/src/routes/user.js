const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, getUserWallet, getUserMatches } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Get user profile
router.get('/profile', getUserProfile);

// Update user profile
router.put('/profile', updateUserProfile);

// Get user wallet balance
router.get('/wallet', getUserWallet);

// Get user match history
router.get('/matches', getUserMatches);

module.exports = router; 