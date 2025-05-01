const User = require('../models/User');
const Match = require('../models/Match');
const { Connection, PublicKey } = require('@solana/web3.js');
const { getTokenBalance } = require('../utils/solana');

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.status(200).json({
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        username: user.username,
        score: user.score || 0,
        rank: user.rank || 'Bronze',
        archetypeId: user.archetypeId || null,
        stats: user.stats || {
          wins: 0,
          losses: 0,
          kills: 0,
          deaths: 0,
          assists: 0
        },
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const { username, archetypeId } = req.body;
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user
    if (username) user.username = username;
    if (archetypeId) user.archetypeId = archetypeId;
    
    await user.save();
    
    return res.status(200).json({
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        username: user.username,
        score: user.score || 0,
        rank: user.rank || 'Bronze',
        archetypeId: user.archetypeId || null
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Get user wallet balance
const getUserWallet = async (req, res) => {
  try {
    const { walletAddress } = req.user;
    
    // Connect to Solana RPC
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    );
    
    // Get $SNS token balance if token mint address is set
    let sasBalance = 0;
    if (process.env.SAS_TOKEN_MINT) {
      sasBalance = await getTokenBalance(
        connection,
        new PublicKey(walletAddress),
        new PublicKey(process.env.SAS_TOKEN_MINT)
      );
    }
    
    // Get SOL balance
    const solBalance = await connection.getBalance(new PublicKey(walletAddress));
    
    return res.status(200).json({
      wallet: {
        address: walletAddress,
        sas: sasBalance,
        sol: solBalance / 1000000000 // Convert lamports to SOL
      }
    });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Get user match history
const getUserMatches = async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 10, status } = req.query;
    
    // Build query
    const query = { 'players.userId': userId };
    
    if (status) {
      query.status = status;
    }
    
    // Get matches
    const matches = await Match.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    return res.status(200).json({
      matches: matches.map(match => {
        const player = match.players.find(p => p.userId.toString() === userId);
        return {
          id: match._id,
          matchId: match.matchId,
          name: match.name,
          modeId: match.modeId,
          status: match.status,
          playerCount: match.players.length,
          maxPlayers: match.maxPlayers,
          createdAt: match.createdAt,
          results: match.results ? {
            winner: match.results.winner,
            mvp: match.results.mvp,
            duration: match.results.duration,
            sasRewards: player ? player.sasRewards : 0
          } : null
        };
      })
    });
  } catch (error) {
    console.error('Error getting user matches:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserWallet,
  getUserMatches
}; 