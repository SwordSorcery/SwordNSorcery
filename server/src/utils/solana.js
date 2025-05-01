const { 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  LAMPORTS_PER_SOL 
} = require('@solana/web3.js');
const { 
  TOKEN_PROGRAM_ID, 
  createTransferInstruction, 
  getOrCreateAssociatedTokenAccount,
  getAccount
} = require('@solana/spl-token');

// Get token balance for a specific token mint
const getTokenBalance = async (connection, walletAddress, tokenMint) => {
  try {
    // Get token account
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletAddress,
      { mint: tokenMint }
    );
    
    // Check if token account exists
    if (tokenAccounts.value.length === 0) {
      return 0;
    }
    
    // Return token balance
    return tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
};

// Create a token transfer transaction
const createTokenTransferTransaction = async (
  connection,
  senderPublicKey,
  recipientPublicKey,
  tokenMint,
  amount
) => {
  try {
    // Get sender token account
    const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderPublicKey,
      tokenMint,
      senderPublicKey
    );
    
    // Get recipient token account
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      senderPublicKey,
      tokenMint,
      recipientPublicKey
    );
    
    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      senderTokenAccount.address,
      recipientTokenAccount.address,
      senderPublicKey,
      amount * Math.pow(10, 9) // Assuming 9 decimals for $SNS
    );
    
    // Create transaction
    const transaction = new Transaction().add(transferInstruction);
    
    // Set recent blockhash and fee payer
    transaction.feePayer = senderPublicKey;
    transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    
    return transaction;
  } catch (error) {
    console.error('Error creating token transfer transaction:', error);
    return null;
  }
};

// Validate a Solana wallet address
const isValidSolanaAddress = (address) => {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  getTokenBalance,
  createTokenTransferTransaction,
  isValidSolanaAddress
}; 