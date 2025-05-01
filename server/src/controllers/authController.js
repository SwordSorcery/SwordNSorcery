const jwt = require('jsonwebtoken');
const { PublicKey } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const User = require('../models/User');
const { generateRandomString } = require('../utils/crypto');

// Store nonces temporarily (should use Redis in production)
const nonceStore = {};

// Generate a nonce for wallet signature verification
const generateNonce = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Validate Solana wallet address
    try {
      new PublicKey(walletAddress);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    // Generate a random nonce
    const nonce = generateRandomString(32);
    
    // Store nonce with expiration (5 minutes)
    nonceStore[walletAddress] = {
      nonce,
      expiresAt: Date.now() + 300000 // 5 minutes
    };
    
    return res.status(200).json({ 
      nonce,
      message: `Sign this message to verify your wallet ownership: ${nonce}`
    });
  } catch (error) {
    console.error('Error generating nonce:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Verify wallet signature and issue JWT
const verifyWalletSignature = async (req, res) => {
  try {
    const { walletAddress, signature, signedMessage } = req.body;
    
    // Check if nonce exists and has not expired
    if (!nonceStore[walletAddress] || 
        nonceStore[walletAddress].expiresAt < Date.now()) {
      return res.status(401).json({ error: 'Nonce expired or not found' });
    }
    
    const expectedMessage = `Sign this message to verify your wallet ownership: ${nonceStore[walletAddress].nonce}`;
    
    // Verify the signed message matches the expected message
    if (signedMessage !== expectedMessage) {
      return res.status(401).json({ error: 'Invalid message' });
    }
    
    // Convert signature from base64 to Uint8Array
    const signatureUint8 = Buffer.from(signature, 'base64');
    
    // Convert message to Uint8Array
    const messageUint8 = new TextEncoder().encode(signedMessage);
    
    // Convert wallet address to PublicKey
    const publicKey = new PublicKey(walletAddress);
    
    // Verify signature
    const verified = nacl.sign.detached.verify(
      messageUint8,
      signatureUint8,
      publicKey.toBytes()
    );
    
    if (!verified) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Clean up used nonce
    delete nonceStore[walletAddress];
    
    // Find or create user
    let user = await User.findOne({ walletAddress });
    
    if (!user) {
      user = await User.create({
        walletAddress,
        username: `Player_${walletAddress.slice(0, 6)}`,
        createdAt: new Date()
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, walletAddress },
      process.env.JWT_SECRET || 'sword-and-sorcery-secret',
      { expiresIn: '24h' }
    );
    
    return res.status(200).json({
      token,
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
    console.error('Error verifying signature:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  generateNonce,
  verifyWalletSignature
}; 