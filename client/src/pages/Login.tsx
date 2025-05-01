import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { RootState } from '../store';
import { getNonce, verifyWallet } from '../store/slices/authSlice';

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { publicKey, signMessage } = useWallet();
  
  const { isAuthenticated, loading, error, nonceMessage } = useSelector(
    (state: RootState) => state.auth
  );
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/lobby');
    }
  }, [isAuthenticated, navigate]);
  
  // Get nonce when wallet is connected
  useEffect(() => {
    if (publicKey && !nonceMessage && !loading) {
      dispatch(getNonce(publicKey.toString()));
    }
  }, [publicKey, nonceMessage, loading, dispatch]);
  
  // Handle wallet verification
  useEffect(() => {
    const verifySignature = async () => {
      if (publicKey && nonceMessage && signMessage) {
        try {
          // Convert message to Uint8Array for signing
          const message = new TextEncoder().encode(nonceMessage);
          
          // Dispatch verification action
          dispatch(
            verifyWallet({
              walletAddress: publicKey.toString(),
              signMessage: async (message: Uint8Array) => await signMessage(message)
            })
          );
        } catch (error) {
          console.error('Error signing message:', error);
        }
      }
    };
    
    if (publicKey && nonceMessage && signMessage && !isAuthenticated) {
      verifySignature();
    }
  }, [publicKey, nonceMessage, signMessage, isAuthenticated, dispatch]);
  
  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <div className="bg-gray-800 rounded-lg p-8 shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-center">Connect Your Wallet</h2>
        <p className="text-gray-300 mb-8 max-w-lg mx-auto">
          Connect your Solana wallet to start playing and earning $SNS tokens.
        </p>
        
        <div className="flex justify-center mb-6">
          <WalletMultiButton className="wallet-button" />
        </div>
        
        {loading && (
          <div className="text-center mb-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-2 text-gray-300">Authenticating...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
        
        <div className="mt-8 border-t border-gray-700 pt-6 text-sm text-gray-400">
          <h3 className="text-lg font-semibold mb-2">Why Connect Your Wallet?</h3>
          <ul className="list-disc pl-5 text-gray-300 space-y-2">
            <li>Authenticate securely using your Solana wallet</li>
            <li>Own your in-game items as NFTs</li>
            <li>Earn and store $SNS tokens from gameplay</li>
            <li>Participate in governance and tournaments</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login; 