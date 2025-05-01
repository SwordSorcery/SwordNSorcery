import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { fetchGameModes, fetchMatches, createMatch } from '../store/slices/gameSlice';

const Lobby: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [selectedMode, setSelectedMode] = useState<string>('');
  const [matchName, setMatchName] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { gameModes, matches, loading, error } = useSelector((state: RootState) => state.game);
  const { profile } = useSelector((state: RootState) => state.user);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  // Fetch game modes and available matches
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchGameModes());
      dispatch(fetchMatches());
      
      // Refresh matches every 30 seconds
      const interval = setInterval(() => {
        dispatch(fetchMatches());
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, dispatch]);
  
  // Handle creating a new match
  const handleCreateMatch = () => {
    if (!selectedMode) {
      return;
    }
    
    const newMatchData = {
      modeId: selectedMode,
      name: matchName || (profile ? `${profile.username}'s Match` : 'New Match'),
      isPrivate,
      password: isPrivate ? password : undefined
    };
    
    dispatch(createMatch(newMatchData));
    setIsCreateModalOpen(false);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left column - Match list */}
        <div className="md:w-2/3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Available Matches</h2>
            
            <div className="flex gap-4">
              <button
                onClick={() => dispatch(fetchMatches())}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing
                  </span>
                ) : (
                  'Refresh'
                )}
              </button>
              
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-secondary hover:bg-orange-600 text-white rounded-lg"
              >
                Create Match
              </button>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
          
          {matches.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400 mb-4">No active matches available</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-2 bg-secondary hover:bg-orange-600 text-white rounded-lg"
              >
                Create First Match
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {matches.map((match) => (
                <div key={match.matchId} className="bg-gray-800 rounded-lg p-4 shadow-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">{match.name}</h3>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        match.status === 'waiting' ? 'bg-blue-900 text-blue-300' :
                        match.status === 'ready' ? 'bg-green-900 text-green-300' :
                        'bg-gray-900 text-gray-300'
                      }`}>
                        {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                      </span>
                      
                      <Link
                        to={`/game/${match.matchId}`}
                        className="px-4 py-1.5 bg-primary hover:bg-indigo-600 text-white rounded-lg text-sm"
                      >
                        Join
                      </Link>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center text-sm text-gray-400">
                    <span className="mr-4">
                      Mode: {match.modeId.charAt(0).toUpperCase() + match.modeId.slice(1).replace('-', ' ')}
                    </span>
                    <span className="mr-4">
                      Players: {match.playerCount}/{match.maxPlayers}
                    </span>
                    <span>
                      Created: {new Date(match.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Right column - Game modes and recent activity */}
        <div className="md:w-1/3">
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
            <h3 className="text-xl font-bold mb-4">Game Modes</h3>
            
            {gameModes.map((mode) => (
              <div key={mode.id} className="mb-4 p-4 border border-gray-700 rounded-lg">
                <h4 className="text-lg font-bold">{mode.name}</h4>
                <p className="text-sm text-gray-300 mb-2">{mode.description}</p>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Time: {mode.duration / 60} min</span>
                  <span>Players: {mode.minPlayers}-{mode.maxPlayers}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-4">Leaderboard</h3>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-gray-300 text-sm">
                Earn $SNS tokens by winning matches and completing objectives.
              </p>
            </div>
            <div className="mt-4">
              <Link
                to="/profile"
                className="block w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-center text-white rounded-lg"
              >
                View Your Stats
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Create Match Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Create New Match</h3>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-1 text-sm">Match Name</label>
              <input
                type="text"
                value={matchName}
                onChange={(e) => setMatchName(e.target.value)}
                placeholder={profile ? `${profile.username}'s Match` : 'New Match'}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-300 mb-1 text-sm">Game Mode</label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a game mode</option>
                {gameModes.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.name} ({mode.minPlayers}-{mode.maxPlayers} players)
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-gray-300 text-sm">Private Match</span>
              </label>
            </div>
            
            {isPrivate && (
              <div className="mb-4">
                <label className="block text-gray-300 mb-1 text-sm">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Cancel
              </button>
              
              <button
                onClick={handleCreateMatch}
                disabled={!selectedMode}
                className={`px-4 py-2 text-white rounded-lg ${
                  selectedMode ? 'bg-secondary hover:bg-orange-600' : 'bg-gray-600 cursor-not-allowed'
                }`}
              >
                Create Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby; 