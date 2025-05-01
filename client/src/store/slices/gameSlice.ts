import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// Define API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Define types
interface GameMode {
  id: string;
  name: string;
  description: string;
  duration: number;
  minPlayers: number;
  maxPlayers: number;
  teams?: number;
  rewards: {
    kill: number;
    assist: number;
    victory: number;
    pointControl?: number;
  };
}

interface Match {
  id: string;
  matchId: string;
  name: string;
  modeId: string;
  status: string;
  playerCount: number;
  maxPlayers: number;
  isPrivate: boolean;
  createdAt: string;
  players?: {
    username: string;
    status: string;
  }[];
}

interface Player {
  userId: string;
  username: string;
  team: number;
  position: { x: number; y: number };
  health?: number;
  stamina?: number;
  status?: string;
}

interface Arena {
  width: number;
  height: number;
  obstacles: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  spawnPoints: {
    [key: string]: { x: number; y: number }[];
  };
}

interface GameState {
  gameModes: GameMode[];
  matches: Match[];
  currentMatch: Match | null;
  players: Player[];
  socket: Socket | null;
  arena: Arena | null;
  gameStatus: 'idle' | 'loading' | 'connecting' | 'waiting' | 'starting' | 'playing' | 'completed';
  countdown: number;
  error: string | null;
}

// Create async thunks
export const fetchGameModes = createAsyncThunk(
  'game/fetchGameModes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/game/modes`);
      return response.data.modes;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch game modes');
    }
  }
);

export const fetchMatches = createAsyncThunk(
  'game/fetchMatches',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/game/matches`);
      return response.data.matches;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch matches');
    }
  }
);

export const createMatch = createAsyncThunk(
  'game/createMatch',
  async (matchData: { modeId: string; name?: string; isPrivate?: boolean; password?: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return rejectWithValue('Not authenticated');
      }
      
      const response = await axios.post(
        `${API_URL}/game/match/create`,
        matchData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      return response.data.match;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create match');
    }
  }
);

export const joinMatch = createAsyncThunk(
  'game/joinMatch',
  async ({ matchId, password }: { matchId: string; password?: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return rejectWithValue('Not authenticated');
      }
      
      const response = await axios.post(
        `${API_URL}/game/match/join/${matchId}`,
        { password },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      return response.data.match;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to join match');
    }
  }
);

export const fetchMatchById = createAsyncThunk(
  'game/fetchMatchById',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/game/match/${matchId}`);
      return response.data.match;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch match');
    }
  }
);

// Initial state
const initialState: GameState = {
  gameModes: [],
  matches: [],
  currentMatch: null,
  players: [],
  socket: null,
  arena: null,
  gameStatus: 'idle',
  countdown: 0,
  error: null
};

// Create slice
const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // Socket actions
    connectSocket: (state, action: PayloadAction<string>) => {
      // Connect to socket.io server
      const token = localStorage.getItem('token');
      
      if (!token) {
        state.error = 'Not authenticated';
        return;
      }
      
      const socketURL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
      
      state.socket = io(socketURL, {
        auth: { token },
        transports: ['websocket']
      });
      
      state.gameStatus = 'connecting';
    },
    disconnectSocket: (state) => {
      if (state.socket) {
        state.socket.disconnect();
        state.socket = null;
      }
      
      state.gameStatus = 'idle';
    },
    // Game state updates
    setPlayers: (state, action: PayloadAction<Player[]>) => {
      state.players = action.payload;
    },
    updatePlayerPosition: (state, action: PayloadAction<{ userId: string; position: { x: number; y: number } }>) => {
      const { userId, position } = action.payload;
      const playerIndex = state.players.findIndex(p => p.userId === userId);
      
      if (playerIndex !== -1) {
        state.players[playerIndex].position = position;
      }
    },
    updatePlayerHealth: (state, action: PayloadAction<{ userId: string; health: number }>) => {
      const { userId, health } = action.payload;
      const playerIndex = state.players.findIndex(p => p.userId === userId);
      
      if (playerIndex !== -1 && state.players[playerIndex].health !== undefined) {
        state.players[playerIndex].health = health;
      }
    },
    setArena: (state, action: PayloadAction<Arena>) => {
      state.arena = action.payload;
    },
    setGameStatus: (state, action: PayloadAction<GameState['gameStatus']>) => {
      state.gameStatus = action.payload;
    },
    setCountdown: (state, action: PayloadAction<number>) => {
      state.countdown = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch game modes
      .addCase(fetchGameModes.pending, (state) => {
        state.gameStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchGameModes.fulfilled, (state, action: PayloadAction<GameMode[]>) => {
        state.gameStatus = 'idle';
        state.gameModes = action.payload;
      })
      .addCase(fetchGameModes.rejected, (state, action) => {
        state.gameStatus = 'idle';
        state.error = action.payload as string;
      })
      // Fetch matches
      .addCase(fetchMatches.pending, (state) => {
        state.gameStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchMatches.fulfilled, (state, action: PayloadAction<Match[]>) => {
        state.gameStatus = 'idle';
        state.matches = action.payload;
      })
      .addCase(fetchMatches.rejected, (state, action) => {
        state.gameStatus = 'idle';
        state.error = action.payload as string;
      })
      // Create match
      .addCase(createMatch.pending, (state) => {
        state.gameStatus = 'loading';
        state.error = null;
      })
      .addCase(createMatch.fulfilled, (state, action: PayloadAction<Match>) => {
        state.gameStatus = 'waiting';
        state.currentMatch = action.payload;
      })
      .addCase(createMatch.rejected, (state, action) => {
        state.gameStatus = 'idle';
        state.error = action.payload as string;
      })
      // Join match
      .addCase(joinMatch.pending, (state) => {
        state.gameStatus = 'loading';
        state.error = null;
      })
      .addCase(joinMatch.fulfilled, (state, action: PayloadAction<Match>) => {
        state.gameStatus = 'waiting';
        state.currentMatch = action.payload;
      })
      .addCase(joinMatch.rejected, (state, action) => {
        state.gameStatus = 'idle';
        state.error = action.payload as string;
      })
      // Fetch match by ID
      .addCase(fetchMatchById.pending, (state) => {
        state.gameStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchMatchById.fulfilled, (state, action: PayloadAction<Match>) => {
        state.currentMatch = action.payload;
        state.gameStatus = action.payload.status === 'in-progress' ? 'playing' : 'waiting';
      })
      .addCase(fetchMatchById.rejected, (state, action) => {
        state.gameStatus = 'idle';
        state.error = action.payload as string;
      });
  }
});

export const {
  connectSocket,
  disconnectSocket,
  setPlayers,
  updatePlayerPosition,
  updatePlayerHealth,
  setArena,
  setGameStatus,
  setCountdown,
  clearError
} = gameSlice.actions;
export default gameSlice.reducer; 