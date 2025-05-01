const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  walletAddress: {
    type: String,
    required: true
  },
  team: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['waiting', 'ready', 'playing', 'disconnected'],
    default: 'waiting'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  stats: {
    kills: {
      type: Number,
      default: 0
    },
    deaths: {
      type: Number,
      default: 0
    },
    assists: {
      type: Number,
      default: 0
    },
    score: {
      type: Number,
      default: 0
    },
    objectivePoints: {
      type: Number,
      default: 0
    }
  },
  sasRewards: {
    type: Number,
    default: 0
  }
});

const resultSchema = new mongoose.Schema({
  winner: {
    type: String, // userId or team ID
    required: true
  },
  mvp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  duration: {
    type: Number, // in seconds
    required: true
  },
  totalSasRewarded: {
    type: Number,
    default: 0
  },
  teamScores: {
    type: Map,
    of: Number,
    default: new Map()
  }
});

const chatMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 200
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const matchSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 50
  },
  modeId: {
    type: String,
    required: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  players: [playerSchema],
  status: {
    type: String,
    enum: ['waiting', 'ready', 'in-progress', 'completed', 'cancelled'],
    default: 'waiting'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    default: null
  },
  maxPlayers: {
    type: Number,
    required: true
  },
  results: {
    type: resultSchema,
    default: null
  },
  chat: [chatMessageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Match', matchSchema); 