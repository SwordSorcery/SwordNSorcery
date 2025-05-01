import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { fetchMatchById, connectSocket, disconnectSocket } from '../store/slices/gameSlice';
import GameCanvas from '../components/game/GameCanvas';

const Game: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentMatch, gameStatus, error, socket } = useSelector(
    (state: RootState) => state.game
  );
  
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  // Fetch match data and connect to socket
  useEffect(() => {
    if (matchId && isAuthenticated) {
      // Fetch match data
      dispatch(fetchMatchById(matchId));
      
      // Connect to socket.io server
      if (!socket) {
        dispatch(connectSocket(matchId));
      }
      
      // Cleanup on unmount
      return () => {
        dispatch(disconnectSocket());
      };
    }
  }, [matchId, isAuthenticated, socket, dispatch]);
  
  // Error handling
  useEffect(() => {
    if (error) {
      setTimeout(() => {
        navigate('/lobby');
      }, 3000);
    }
  }, [error, navigate]);
  
  if (!matchId) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-6 mb-4 text-center">
          <h2 className="text-xl font-bold mb-2">Match Not Found</h2>
          <p className="text-red-300">No match ID provided. Redirecting...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col">
        {/* Match info */}
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {currentMatch ? currentMatch.name : 'Loading match...'}
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">
                Status: 
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                gameStatus === 'playing' ? 'bg-green-900 text-green-300' : 
                gameStatus === 'waiting' ? 'bg-blue-900 text-blue-300' :
                gameStatus === 'loading' ? 'bg-yellow-900 text-yellow-300' :
                'bg-gray-900 text-gray-300'
              }`}>
                {gameStatus.charAt(0).toUpperCase() + gameStatus.slice(1)}
              </span>
            </div>
          </div>
          
          {currentMatch && (
            <div className="mt-2 text-sm text-gray-300">
              <span className="mr-4">
                Players: {currentMatch.playerCount}/{currentMatch.maxPlayers}
              </span>
              <span>
                Mode: {currentMatch.modeId.charAt(0).toUpperCase() + currentMatch.modeId.slice(1).replace('-', ' ')}
              </span>
            </div>
          )}
        </div>
        
        {/* Game canvas */}
        {matchId && socket && (
          <GameCanvas matchId={matchId} />
        )}
        
        {/* Loading state */}
        {gameStatus === 'loading' && (
          <div className="h-[600px] flex items-center justify-center bg-gray-900 rounded-lg">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-4 text-xl">Loading game...</p>
            </div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="h-[600px] flex items-center justify-center bg-gray-900 rounded-lg">
            <div className="text-center max-w-md">
              <div className="text-5xl text-red-500 mb-4">⚠️</div>
              <h3 className="text-xl font-bold mb-2">Error</h3>
              <p className="text-red-300 mb-4">{error}</p>
              <p className="text-gray-400">Redirecting to lobby...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Game; 