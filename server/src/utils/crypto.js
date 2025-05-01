const crypto = require('crypto');

// Generate a random string for nonce
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate a unique match ID
const generateMatchId = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Hash password for private matches
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

module.exports = {
  generateRandomString,
  generateMatchId,
  hashPassword
}; 