const Match = require('../models/Match');
const User = require('../models/User');
const { generateMatchId } = require('../utils/crypto');

// Game modes
const GAME_MODES = [
  {
    id: 'deathmatch',
    name: 'Deathmatch',
    description: '4-8 players compete for kills, highest score wins',
    duration: 600, // 10 minutes in seconds
    minPlayers: 4,
    maxPlayers: 8,
    rewards: {
      kill: 0.1,
      assist: 0.05,
      victory: 0.5
    }
  },
  {
    id: 'team-duel',
    name: 'Team Duel',
    description: '4v4 team-based combat, victory based on total kills',
    duration: 720, // 12 minutes in seconds
    minPlayers: 8,
    maxPlayers: 8,
    teams: 2,
    rewards: {
      kill: 0.1,
      assist: 0.05,
      victory: 0.5
    }
  },
  {
    id: 'conquest',
    name: 'Conquest',
    description: 'Capture and hold arena points to earn scores',
    duration: 900, // 15 minutes in seconds
    minPlayers: 6,
    maxPlayers: 12,
    teams: 2,
    rewards: {
      kill: 0.1,
      assist: 0.05,
      pointControl: 0.01, // per second
      victory: 0.5
    }
  }
];

// Get available game modes
const getGameModes = (req, res) => {
  try {
    return res.status(200).json({ modes: GAME_MODES });
  } catch (error) {
    console.error('Error getting game modes:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Create a new match
const createMatch = async (req, res) => {
  try {
    const { modeId, name, isPrivate, password } = req.body;
    const { userId, walletAddress } = req.user;
    
    // Validate game mode
    const gameMode = GAME_MODES.find(mode => mode.id === modeId);
    if (!gameMode) {
      return res.status(400).json({ error: 'Invalid game mode' });
    }
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create match
    const match = new Match({
      matchId: generateMatchId(),
      name: name || `${user.username}'s Match`,
      modeId,
      host: userId,
      players: [{
        userId,
        username: user.username,
        walletAddress,
        status: 'ready',
        joinedAt: new Date()
      }],
      status: 'waiting',
      isPrivate: isPrivate || false,
      password: password || null,
      createdAt: new Date(),
      maxPlayers: gameMode.maxPlayers
    });
    
    await match.save();
    
    return res.status(201).json({
      match: {
        id: match._id,
        matchId: match.matchId,
        name: match.name,
        modeId: match.modeId,
        status: match.status,
        playerCount: 1,
        maxPlayers: match.maxPlayers,
        isPrivate: match.isPrivate,
        createdAt: match.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating match:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Join an existing match
const joinMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const { userId, walletAddress } = req.user;
    
    // Get match
    const match = await Match.findOne({ matchId: id });
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Check if match is full
    if (match.players.length >= match.maxPlayers) {
      return res.status(400).json({ error: 'Match is full' });
    }
    
    // Check if match is in progress
    if (match.status === 'in-progress') {
      return res.status(400).json({ error: 'Match already in progress' });
    }
    
    // Check if match is private and requires password
    if (match.isPrivate && match.password && match.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Check if player is already in the match
    const existingPlayer = match.players.find(p => p.userId.toString() === userId);
    if (existingPlayer) {
      return res.status(400).json({ error: 'Already in this match' });
    }
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Add player to match
    match.players.push({
      userId,
      username: user.username,
      walletAddress,
      status: 'ready',
      joinedAt: new Date()
    });
    
    // If minimum players reached, update status
    const gameMode = GAME_MODES.find(mode => mode.id === match.modeId);
    if (match.players.length >= gameMode.minPlayers) {
      match.status = 'ready';
    }
    
    await match.save();
    
    return res.status(200).json({
      match: {
        id: match._id,
        matchId: match.matchId,
        name: match.name,
        modeId: match.modeId,
        status: match.status,
        playerCount: match.players.length,
        maxPlayers: match.maxPlayers,
        players: match.players.map(p => ({
          username: p.username,
          status: p.status
        }))
      }
    });
  } catch (error) {
    console.error('Error joining match:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Get list of available matches
const getMatches = async (req, res) => {
  try {
    const { mode, status, limit = 10 } = req.query;
    
    // Build query
    const query = {
      status: { $in: ['waiting', 'ready'] },
      isPrivate: false
    };
    
    if (mode) {
      query.modeId = mode;
    }
    
    if (status) {
      query.status = status;
    }
    
    // Get matches
    const matches = await Match.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    return res.status(200).json({
      matches: matches.map(match => ({
        id: match._id,
        matchId: match.matchId,
        name: match.name,
        modeId: match.modeId,
        status: match.status,
        playerCount: match.players.length,
        maxPlayers: match.maxPlayers,
        createdAt: match.createdAt
      }))
    });
  } catch (error) {
    console.error('Error getting matches:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Get match details by ID
const getMatchById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get match
    const match = await Match.findOne({ matchId: id });
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    return res.status(200).json({
      match: {
        id: match._id,
        matchId: match.matchId,
        name: match.name,
        modeId: match.modeId,
        host: match.host,
        status: match.status,
        playerCount: match.players.length,
        maxPlayers: match.maxPlayers,
        isPrivate: match.isPrivate,
        createdAt: match.createdAt,
        players: match.players.map(p => ({
          username: p.username,
          status: p.status,
          joinedAt: p.joinedAt
        }))
      }
    });
  } catch (error) {
    console.error('Error getting match details:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Get leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get top players
    const topPlayers = await User.find()
      .sort({ score: -1 })
      .limit(parseInt(limit))
      .select('username walletAddress score rank');
    
    return res.status(200).json({
      leaderboard: topPlayers.map((player, index) => ({
        position: index + 1,
        username: player.username,
        walletAddress: player.walletAddress,
        score: player.score || 0,
        rank: player.rank || 'Bronze'
      }))
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getGameModes,
  createMatch,
  joinMatch,
  getMatches,
  getMatchById,
  getLeaderboard
}; 