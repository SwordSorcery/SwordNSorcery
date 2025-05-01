const express = require('express');
const router = express.Router();
const { verifyWalletSignature, generateNonce } = require('../controllers/authController');

// Generate a nonce for the user to sign with their Solana wallet
router.get('/nonce/:walletAddress', generateNonce);

// Verify the signature and issue a JWT
router.post('/verify', verifyWalletSignature);

module.exports = router; 