import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const Home: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const userProfile = useSelector((state: RootState) => state.user.profile);
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-orange-500">
          Sword and Sorcery
        </h1>
        <p className="text-xl mb-8">
          A WEB3 multiplayer sword-fighting game built on the Solana blockchain
        </p>
        
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {isAuthenticated ? (
            <Link 
              to="/lobby" 
              className="px-8 py-3 bg-gradient-to-r from-secondary to-orange-600 text-white font-bold rounded-lg text-lg hover:from-orange-600 hover:to-secondary transition duration-300"
            >
              Play Now
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-8 py-3 bg-gradient-to-r from-primary to-indigo-600 text-white font-bold rounded-lg text-lg hover:from-indigo-600 hover:to-primary transition duration-300"
            >
              Connect Wallet
            </Link>
          )}
          
          {userProfile && (
            <Link
              to="/profile" 
              className="px-8 py-3 bg-gray-700 text-white font-bold rounded-lg text-lg hover:bg-gray-600 transition duration-300"
            >
              My Profile
            </Link>
          )}
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-3 text-secondary">Fast-Paced Combat</h3>
            <p className="text-gray-300">
              Master sword fighting techniques with strategic attacks, blocks, and combos in real-time battles.
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="flex flex-col items-center md:items-start">
              <h3 className="text-xl font-bold mb-3 text-secondary">Earn $SNS Tokens</h3>
              <p className="text-gray-300 text-center md:text-left">
                Win matches and tournaments to earn $SNS tokens that can be used for NFT skins and more.
              </p>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-3 text-secondary">Unique NFT Skins</h3>
            <p className="text-gray-300">
              Collect and trade generative NFT sword skins with unique visual effects and properties.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Game Modes</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 border border-gray-700 rounded-lg">
              <h4 className="text-lg font-bold mb-2">Deathmatch</h4>
              <p className="text-sm text-gray-300">
                4-8 players compete for kills, highest score wins in 10-minute rounds.
              </p>
            </div>
            
            <div className="p-4 border border-gray-700 rounded-lg">
              <h4 className="text-lg font-bold mb-2">Team Duel</h4>
              <p className="text-sm text-gray-300">
                4v4 team-based combat, victory based on total kills in 12-minute rounds.
              </p>
            </div>
            
            <div className="p-4 border border-gray-700 rounded-lg">
              <h4 className="text-lg font-bold mb-2">Conquest</h4>
              <p className="text-sm text-gray-300">
                Capture and hold arena points to earn scores in 15-minute rounds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 