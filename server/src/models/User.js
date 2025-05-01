const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    maxlength: 20
  },
  score: {
    type: Number,
    default: 0
  },
  rank: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Legend'],
    default: 'Bronze'
  },
  archetypeId: {
    type: String,
    enum: ['rogue', 'knight', 'sorcerer', 'berserker', null],
    default: null
  },
  stats: {
    wins: {
      type: Number,
      default: 0
    },
    losses: {
      type: Number,
      default: 0
    },
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
    matchesPlayed: {
      type: Number,
      default: 0
    },
    sasEarned: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
});

// Update rank based on score
userSchema.pre('save', function(next) {
  if (this.isModified('score')) {
    if (this.score >= 10000) {
      this.rank = 'Legend';
    } else if (this.score >= 5000) {
      this.rank = 'Diamond';
    } else if (this.score >= 2500) {
      this.rank = 'Platinum';
    } else if (this.score >= 1000) {
      this.rank = 'Gold';
    } else if (this.score >= 500) {
      this.rank = 'Silver';
    } else {
      this.rank = 'Bronze';
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema); 