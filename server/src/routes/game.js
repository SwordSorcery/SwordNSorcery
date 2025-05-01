const express = require('express');
const router = express.Router();
const { getGameModes, createMatch, joinMatch, getMatches, getMatchById, getLeaderboard } = require('../controllers/gameController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public routes
router.get('/modes', getGameModes);
router.get('/matches', getMatches);
router.get('/leaderboard', getLeaderboard);
router.get('/match/:id', getMatchById);

// Protected routes (require authentication)
router.post('/match/create', authenticateToken, createMatch);
router.post('/match/join/:id', authenticateToken, joinMatch);

module.exports = router; 