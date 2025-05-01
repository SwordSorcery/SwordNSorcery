import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { disconnect } = useWallet();
  
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { profile, wallet } = useSelector((state: RootState) => state.user);
  
  const handleLogout = async () => {
    // Disconnect wallet
    if (disconnect) {
      await disconnect();
    }
    
    // Dispatch logout action
    dispatch(logout());
    
    // Navigate to home
    navigate('/');
    
    // Close mobile menu
    setMobileMenuOpen(false);
  };
  
  return (
    <nav className="bg-gray-900 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and title */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">⚔️ SNS</span>
            </Link>
          </div>
          
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-300 hover:text-white transition duration-200">
              Home
            </Link>
            
            {isAuthenticated && (
              <>
                <Link to="/lobby" className="text-gray-300 hover:text-white transition duration-200">
                  Lobby
                </Link>
                <Link to="/profile" className="text-gray-300 hover:text-white transition duration-200">
                  Profile
                </Link>
              </>
            )}
          </div>
          
          {/* Wallet and auth */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && wallet && (
              <div className="flex items-center bg-gray-800 rounded-lg px-3 py-1.5 text-sm">
                <span className="mr-2">
                  {wallet.sas.toFixed(2)} $SNS
                </span>
                <div className="h-4 border-r border-gray-600 mx-2"></div>
                <span>
                  {wallet.sol.toFixed(2)} SOL
                </span>
              </div>
            )}
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-300">
                  {profile?.username || 'Player'}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <WalletMultiButton className="wallet-button" />
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-300 hover:text-white focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-800 py-2">
          <div className="container mx-auto px-4 space-y-2">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-white hover:bg-gray-700"
            >
              Home
            </Link>
            
            {isAuthenticated && (
              <>
                <Link
                  to="/lobby"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-white hover:bg-gray-700"
                >
                  Lobby
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-white hover:bg-gray-700"
                >
                  Profile
                </Link>
              </>
            )}
            
            {isAuthenticated ? (
              <>
                {wallet && (
                  <div className="px-3 py-2 text-gray-300 text-sm">
                    <div className="flex justify-between">
                      <span>$SNS Balance:</span>
                      <span>{wallet.sas.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SOL Balance:</span>
                      <span>{wallet.sol.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-md text-white bg-red-900 hover:bg-red-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="px-3 py-2">
                <WalletMultiButton className="wallet-button" />
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 