import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Phaser from 'phaser';
import GameScene from './GameScene';
import { RootState } from '../../store';
import { setGameStatus } from '../../store/slices/gameSlice';

interface GameCanvasProps {
  matchId: string;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ matchId }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  
  const dispatch = useDispatch();
  
  // Get data from Redux store
  const socket = useSelector((state: RootState) => state.game.socket);
  const userId = useSelector((state: RootState) => state.user.profile?.id);
  
  useEffect(() => {
    // Make sure we have all required data before initializing the game
    if (gameRef.current && socket && userId && !gameInstanceRef.current) {
      // Configure Phaser
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: gameRef.current,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0 },
            debug: false
          }
        },
        scene: [new GameScene({ socket, matchId, userId })],
        backgroundColor: '#1a1a2e'
      };
      
      // Initialize Phaser game
      gameInstanceRef.current = new Phaser.Game(config);
      
      // Update game status in Redux
      dispatch(setGameStatus('playing'));
      
      // Clean up on unmount
      return () => {
        if (gameInstanceRef.current) {
          gameInstanceRef.current.destroy(true);
          gameInstanceRef.current = null;
        }
      };
    }
  }, [socket, matchId, userId, dispatch]);
  
  return (
    <div className="game-container">
      <div ref={gameRef} id="game-canvas" className="rounded-lg overflow-hidden shadow-lg" />
      
      {/* Game controls help */}
      <div className="mt-4 bg-gray-800 rounded-lg p-4 text-sm">
        <h3 className="text-lg font-bold mb-2">Controls:</h3>
        <ul className="grid grid-cols-2 gap-2">
          <li><span className="font-bold">Move:</span> Arrow Keys / WASD</li>
          <li><span className="font-bold">Light Attack:</span> Space</li>
          <li><span className="font-bold">Heavy Attack:</span> Shift</li>
          <li><span className="font-bold">Block:</span> B</li>
        </ul>
      </div>
    </div>
  );
};

export default GameCanvas; 