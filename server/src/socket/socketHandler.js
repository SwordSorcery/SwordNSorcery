const jwt = require('jsonwebtoken');
const Match = require('../models/Match');
const User = require('../models/User');

// Store active game sessions
const activeSessions = new Map();

// Socket handler
const socketHandler = (io) => {
  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    
    jwt.verify(
      token,
      process.env.JWT_SECRET || 'sword-and-sorcery-secret',
      (err, decoded) => {
        if (err) {
          return next(new Error('Invalid token'));
        }
        
        // Set user data on socket
        socket.user = decoded;
        next();
      }
    );
  });
  
  // Connection event
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.userId}`);
    
    // Join a match lobby
    socket.on('join-match', async (matchId) => {
      try {
        // Find match
        const match = await Match.findOne({ matchId });
        
        if (!match) {
          return socket.emit('error', { message: 'Match not found' });
        }
        
        // Join socket room
        socket.join(`match-${matchId}`);
        
        // Notify room of new player
        io.to(`match-${matchId}`).emit('player-joined', {
          userId: socket.user.userId,
          walletAddress: socket.user.walletAddress
        });
        
        // Send match data to client
        socket.emit('match-data', {
          match: {
            id: match._id,
            matchId: match.matchId,
            name: match.name,
            modeId: match.modeId,
            status: match.status,
            players: match.players.map(p => ({
              userId: p.userId,
              username: p.username,
              status: p.status,
              team: p.team
            }))
          }
        });
      } catch (error) {
        console.error('Error joining match:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });
    
    // Start match
    socket.on('start-match', async (matchId) => {
      try {
        // Find match
        const match = await Match.findOne({ matchId });
        
        if (!match) {
          return socket.emit('error', { message: 'Match not found' });
        }
        
        // Verify user is host
        if (match.host.toString() !== socket.user.userId) {
          return socket.emit('error', { message: 'Only host can start match' });
        }
        
        // Update match status
        match.status = 'in-progress';
        match.startedAt = new Date();
        await match.save();
        
        // Create game session
        const gameSession = {
          matchId: match.matchId,
          players: new Map(),
          gameState: {
            status: 'starting',
            timeRemaining: 5, // 5 second countdown
            arena: generateArena(match.modeId)
          }
        };
        
        // Add players to session
        match.players.forEach(player => {
          gameSession.players.set(player.userId.toString(), {
            userId: player.userId.toString(),
            username: player.username,
            team: player.team,
            position: getRandomSpawnPoint(gameSession.gameState.arena, player.team),
            health: 100,
            stamina: 100,
            status: 'alive',
            lastAction: Date.now()
          });
        });
        
        // Store session
        activeSessions.set(matchId, gameSession);
        
        // Notify all players
        io.to(`match-${matchId}`).emit('match-started', {
          countdown: 5,
          arena: gameSession.gameState.arena
        });
        
        // Start countdown
        startMatchCountdown(io, matchId);
      } catch (error) {
        console.error('Error starting match:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });
    
    // Player movement
    socket.on('player-move', async (data) => {
      try {
        const { matchId, direction, position } = data;
        
        // Validate movement (simplified)
        if (!activeSessions.has(matchId)) {
          return socket.emit('error', { message: 'Match not active' });
        }
        
        const gameSession = activeSessions.get(matchId);
        const player = gameSession.players.get(socket.user.userId);
        
        if (!player) {
          return socket.emit('error', { message: 'Player not in match' });
        }
        
        // Update player position (simplified collision detection)
        const newPosition = validatePosition(
          position,
          gameSession.gameState.arena
        );
        
        player.position = newPosition;
        player.lastAction = Date.now();
        
        // Broadcast movement to other players
        socket.to(`match-${matchId}`).emit('player-moved', {
          userId: socket.user.userId,
          position: newPosition
        });
      } catch (error) {
        console.error('Error handling player movement:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });
    
    // Player attack
    socket.on('player-attack', async (data) => {
      try {
        const { matchId, attackType, direction } = data;
        
        // Validate attack
        if (!activeSessions.has(matchId)) {
          return socket.emit('error', { message: 'Match not active' });
        }
        
        const gameSession = activeSessions.get(matchId);
        const attacker = gameSession.players.get(socket.user.userId);
        
        if (!attacker) {
          return socket.emit('error', { message: 'Player not in match' });
        }
        
        // Check if player has enough stamina
        const staminaCost = attackType === 'light' ? 10 : 25;
        
        if (attacker.stamina < staminaCost) {
          return socket.emit('error', { message: 'Not enough stamina' });
        }
        
        // Deduct stamina
        attacker.stamina -= staminaCost;
        attacker.lastAction = Date.now();
        
        // Calculate attack damage and hitbox
        const attackInfo = calculateAttack(
          attackType,
          attacker.position,
          direction
        );
        
        // Check for hits
        const hitPlayers = [];
        
        gameSession.players.forEach((player, playerId) => {
          // Skip self and team members
          if (
            playerId === socket.user.userId ||
            player.team === attacker.team ||
            player.status !== 'alive'
          ) {
            return;
          }
          
          // Check if attack hits player
          if (isPlayerHit(player.position, attackInfo.hitbox)) {
            // Apply damage
            player.health -= attackInfo.damage;
            
            // Check if player is defeated
            if (player.health <= 0) {
              player.health = 0;
              player.status = 'defeated';
              
              // Award kill
              updatePlayerStats(matchId, socket.user.userId, playerId);
            }
            
            hitPlayers.push({
              userId: playerId,
              damage: attackInfo.damage,
              health: player.health,
              defeated: player.health <= 0
            });
          }
        });
        
        // Broadcast attack to all players
        io.to(`match-${matchId}`).emit('player-attacked', {
          userId: socket.user.userId,
          attackType,
          direction,
          hitPlayers,
          stamina: attacker.stamina
        });
        
        // Check if match is over
        checkMatchStatus(io, matchId, gameSession);
      } catch (error) {
        console.error('Error handling player attack:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });
    
    // Send chat message
    socket.on('send-message', async (data) => {
      try {
        const { matchId, message } = data;
        
        // Validate message
        if (!message || message.length > 200) {
          return socket.emit('error', { message: 'Invalid message' });
        }
        
        // Find match
        const match = await Match.findOne({ matchId });
        
        if (!match) {
          return socket.emit('error', { message: 'Match not found' });
        }
        
        // Find user
        const user = await User.findById(socket.user.userId);
        
        if (!user) {
          return socket.emit('error', { message: 'User not found' });
        }
        
        // Create chat message
        const chatMessage = {
          userId: user._id,
          username: user.username,
          message,
          timestamp: new Date()
        };
        
        // Add message to match
        match.chat.push(chatMessage);
        await match.save();
        
        // Broadcast message to all players in match
        io.to(`match-${matchId}`).emit('new-message', chatMessage);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Server error' });
      }
    });
    
    // Leave match
    socket.on('leave-match', async (matchId) => {
      try {
        leaveMatch(socket, matchId);
      } catch (error) {
        console.error('Error leaving match:', error);
      }
    });
    
    // Disconnect event
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.userId}`);
      
      // Handle player disconnection for all active matches
      activeSessions.forEach((session, matchId) => {
        if (session.players.has(socket.user.userId)) {
          leaveMatch(socket, matchId);
        }
      });
    });
  });
};

// Helper function to handle player leaving a match
const leaveMatch = async (socket, matchId) => {
  try {
    // Leave socket room
    socket.leave(`match-${matchId}`);
    
    // Find match
    const match = await Match.findOne({ matchId });
    
    if (!match) {
      return;
    }
    
    // If match is in progress, mark player as disconnected
    if (match.status === 'in-progress') {
      // Update player status in active session
      if (activeSessions.has(matchId)) {
        const gameSession = activeSessions.get(matchId);
        const player = gameSession.players.get(socket.user.userId);
        
        if (player) {
          player.status = 'disconnected';
        }
      }
      
      // Update player status in database
      const playerIndex = match.players.findIndex(
        p => p.userId.toString() === socket.user.userId
      );
      
      if (playerIndex !== -1) {
        match.players[playerIndex].status = 'disconnected';
        await match.save();
      }
    } else {
      // If match is not in progress, remove player from match
      match.players = match.players.filter(
        p => p.userId.toString() !== socket.user.userId
      );
      
      // If host left and other players remain, assign new host
      if (
        match.host.toString() === socket.user.userId &&
        match.players.length > 0
      ) {
        match.host = match.players[0].userId;
      }
      
      // If no players left, cancel match
      if (match.players.length === 0) {
        match.status = 'cancelled';
      }
      
      await match.save();
    }
    
    // Notify other players
    socket.to(`match-${matchId}`).emit('player-left', {
      userId: socket.user.userId,
      newHost: match.host.toString()
    });
  } catch (error) {
    console.error('Error handling match leave:', error);
  }
};

// Start match countdown
const startMatchCountdown = (io, matchId) => {
  let countdown = 5;
  
  const timer = setInterval(() => {
    countdown--;
    
    if (countdown <= 0) {
      clearInterval(timer);
      
      // Start the actual game
      if (activeSessions.has(matchId)) {
        const gameSession = activeSessions.get(matchId);
        gameSession.gameState.status = 'active';
        
        // Notify all players
        io.to(`match-${matchId}`).emit('game-started', {
          players: Array.from(gameSession.players.values()).map(p => ({
            userId: p.userId,
            username: p.username,
            team: p.team,
            position: p.position
          }))
        });
      }
    } else {
      // Update countdown
      io.to(`match-${matchId}`).emit('countdown', { countdown });
    }
  }, 1000);
};

// Generate a random arena
const generateArena = (modeId) => {
  // Simplified arena generation
  return {
    width: 800,
    height: 600,
    obstacles: [
      { x: 100, y: 100, width: 50, height: 200 },
      { x: 650, y: 300, width: 50, height: 200 },
      { x: 350, y: 250, width: 100, height: 100 }
    ],
    spawnPoints: {
      0: [
        { x: 50, y: 50 },
        { x: 50, y: 550 },
        { x: 750, y: 50 },
        { x: 750, y: 550 }
      ],
      1: [
        { x: 100, y: 300 },
        { x: 150, y: 300 }
      ],
      2: [
        { x: 650, y: 300 },
        { x: 700, y: 300 }
      ]
    }
  };
};

// Get a random spawn point for a team
const getRandomSpawnPoint = (arena, team) => {
  const spawnPoints = arena.spawnPoints[team] || arena.spawnPoints[0];
  return spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
};

// Validate player position (simple collision detection)
const validatePosition = (position, arena) => {
  // Ensure player stays within arena bounds
  let x = Math.max(0, Math.min(position.x, arena.width));
  let y = Math.max(0, Math.min(position.y, arena.height));
  
  // Simple obstacle collision (can be improved)
  for (const obstacle of arena.obstacles) {
    if (
      x >= obstacle.x && 
      x <= obstacle.x + obstacle.width &&
      y >= obstacle.y && 
      y <= obstacle.y + obstacle.height
    ) {
      // Move player outside obstacle
      if (x - obstacle.x < 10) x = obstacle.x - 1;
      else if (obstacle.x + obstacle.width - x < 10) x = obstacle.x + obstacle.width + 1;
      else if (y - obstacle.y < 10) y = obstacle.y - 1;
      else if (obstacle.y + obstacle.height - y < 10) y = obstacle.y + obstacle.height + 1;
    }
  }
  
  return { x, y };
};

// Calculate attack hitbox and damage
const calculateAttack = (attackType, position, direction) => {
  let damage = attackType === 'light' ? 10 : 25;
  let range = attackType === 'light' ? 50 : 75;
  
  // Calculate hitbox based on direction
  let hitbox = {
    x: position.x,
    y: position.y,
    width: 0,
    height: 0
  };
  
  switch (direction) {
    case 'up':
      hitbox.y -= range;
      hitbox.width = 30;
      hitbox.height = range;
      break;
    case 'down':
      hitbox.width = 30;
      hitbox.height = range;
      break;
    case 'left':
      hitbox.x -= range;
      hitbox.width = range;
      hitbox.height = 30;
      break;
    case 'right':
      hitbox.width = range;
      hitbox.height = 30;
      break;
  }
  
  return { damage, hitbox };
};

// Check if player is hit by attack
const isPlayerHit = (playerPosition, hitbox) => {
  // Simple hitbox collision
  return (
    playerPosition.x >= hitbox.x &&
    playerPosition.x <= hitbox.x + hitbox.width &&
    playerPosition.y >= hitbox.y &&
    playerPosition.y <= hitbox.y + hitbox.height
  );
};

// Update player stats for kills/deaths
const updatePlayerStats = async (matchId, killerId, victimId) => {
  try {
    // Find match
    const match = await Match.findOne({ matchId });
    
    if (!match) {
      return;
    }
    
    // Update killer stats
    const killerIndex = match.players.findIndex(
      p => p.userId.toString() === killerId
    );
    
    if (killerIndex !== -1) {
      if (!match.players[killerIndex].stats) {
        match.players[killerIndex].stats = { kills: 0, deaths: 0, assists: 0, score: 0 };
      }
      match.players[killerIndex].stats.kills += 1;
      match.players[killerIndex].stats.score += 100;
    }
    
    // Update victim stats
    const victimIndex = match.players.findIndex(
      p => p.userId.toString() === victimId
    );
    
    if (victimIndex !== -1) {
      if (!match.players[victimIndex].stats) {
        match.players[victimIndex].stats = { kills: 0, deaths: 0, assists: 0, score: 0 };
      }
      match.players[victimIndex].stats.deaths += 1;
    }
    
    await match.save();
  } catch (error) {
    console.error('Error updating player stats:', error);
  }
};

// Check if match is over
const checkMatchStatus = (io, matchId, gameSession) => {
  try {
    // Team-based modes
    if (gameSession.gameState.arena.spawnPoints[1]) {
      // Check if all players in a team are defeated
      const teamStatus = new Map();
      
      // Initialize team status
      gameSession.players.forEach(player => {
        if (!teamStatus.has(player.team)) {
          teamStatus.set(player.team, true); // Team has active players
        }
        
        if (player.status === 'defeated' || player.status === 'disconnected') {
          const allDefeated = Array.from(gameSession.players.values())
            .filter(p => p.team === player.team)
            .every(p => p.status === 'defeated' || p.status === 'disconnected');
          
          if (allDefeated) {
            teamStatus.set(player.team, false); // Team is defeated
          }
        }
      });
      
      // Check winning team
      let winningTeam = null;
      let matchOver = false;
      
      if (teamStatus.get(1) === false && teamStatus.get(2) !== false) {
        winningTeam = 2;
        matchOver = true;
      } else if (teamStatus.get(2) === false && teamStatus.get(1) !== false) {
        winningTeam = 1;
        matchOver = true;
      }
      
      if (matchOver) {
        endMatch(io, matchId, winningTeam);
      }
    } else {
      // Free-for-all modes
      const activePlayers = Array.from(gameSession.players.values())
        .filter(p => p.status === 'alive');
      
      if (activePlayers.length <= 1) {
        const winner = activePlayers.length === 1 ? activePlayers[0].userId : null;
        endMatch(io, matchId, winner);
      }
    }
  } catch (error) {
    console.error('Error checking match status:', error);
  }
};

// End match and distribute rewards
const endMatch = async (io, matchId, winner) => {
  try {
    if (!activeSessions.has(matchId)) {
      return;
    }
    
    const gameSession = activeSessions.get(matchId);
    gameSession.gameState.status = 'completed';
    
    // Calculate match duration
    const match = await Match.findOne({ matchId });
    
    if (!match) {
      return;
    }
    
    const duration = Math.floor(
      (Date.now() - match.startedAt.getTime()) / 1000
    );
    
    // Determine MVP
    let mvp = null;
    let highestScore = -1;
    
    match.players.forEach(player => {
      const score = player.stats ? player.stats.score : 0;
      if (score > highestScore) {
        highestScore = score;
        mvp = player.userId;
      }
    });
    
    // Calculate rewards
    let totalRewards = 0;
    
    // Update player stats and calculate rewards
    for (const player of match.players) {
      let reward = 0;
      
      // Base reward
      if (player.stats) {
        reward += player.stats.kills * 0.1; // 0.1 $SNS per kill
        reward += player.stats.assists * 0.05; // 0.05 $SNS per assist
      }
      
      // Victory reward
      if (
        (typeof winner === 'number' && player.team === winner) ||
        (typeof winner === 'string' && player.userId.toString() === winner)
      ) {
        reward += 0.5; // 0.5 $SNS for victory
      }
      
      // MVP reward
      if (player.userId.toString() === mvp?.toString()) {
        reward += 0.2; // 0.2 $SNS for MVP
      }
      
      // Cap daily rewards (simplified)
      reward = Math.min(reward, 10);
      player.sasRewards = reward;
      totalRewards += reward;
      
      // Update user stats
      const user = await User.findById(player.userId);
      
      if (user) {
        if (!user.stats) {
          user.stats = {
            wins: 0,
            losses: 0,
            kills: 0,
            deaths: 0,
            assists: 0,
            matchesPlayed: 0,
            sasEarned: 0
          };
        }
        
        user.stats.matchesPlayed += 1;
        user.stats.sasEarned += reward;
        
        if (player.stats) {
          user.stats.kills += player.stats.kills || 0;
          user.stats.deaths += player.stats.deaths || 0;
          user.stats.assists += player.stats.assists || 0;
        }
        
        if (
          (typeof winner === 'number' && player.team === winner) ||
          (typeof winner === 'string' && player.userId.toString() === winner)
        ) {
          user.stats.wins += 1;
          user.score += 500; // Win bonus
        } else {
          user.stats.losses += 1;
        }
        
        // Add match-specific score to user total score
        if (player.stats && player.stats.score) {
          user.score += player.stats.score;
        }
        
        await user.save();
      }
    }
    
    // Update match results
    match.status = 'completed';
    match.endedAt = new Date();
    match.results = {
      winner: typeof winner === 'number' ? `team-${winner}` : winner,
      mvp,
      duration,
      totalSasRewarded: totalRewards
    };
    
    // Set team scores
    if (typeof winner === 'number') {
      const teamScores = new Map();
      
      match.players.forEach(player => {
        const team = player.team;
        const score = player.stats ? player.stats.score : 0;
        
        if (!teamScores.has(`team-${team}`)) {
          teamScores.set(`team-${team}`, 0);
        }
        
        teamScores.set(`team-${team}`, teamScores.get(`team-${team}`) + score);
      });
      
      match.results.teamScores = teamScores;
    }
    
    await match.save();
    
    // Notify all players
    io.to(`match-${matchId}`).emit('match-ended', {
      winner,
      mvp,
      duration,
      players: match.players.map(p => ({
        userId: p.userId,
        username: p.username,
        team: p.team,
        stats: p.stats || { kills: 0, deaths: 0, assists: 0, score: 0 },
        sasRewards: p.sasRewards || 0
      }))
    });
    
    // Clean up session
    setTimeout(() => {
      activeSessions.delete(matchId);
    }, 60000); // Remove session after 1 minute
  } catch (error) {
    console.error('Error ending match:', error);
  }
};

module.exports = socketHandler; 