import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Define API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Define types
interface UserStats {
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  assists: number;
  matchesPlayed: number;
  sasEarned: number;
}

interface UserProfile {
  id: string;
  walletAddress: string;
  username: string;
  score: number;
  rank: string;
  archetypeId: string | null;
  stats: UserStats;
  createdAt: string;
}

interface WalletBalance {
  address: string;
  sas: number;
  sol: number;
}

interface UserMatch {
  id: string;
  matchId: string;
  name: string;
  modeId: string;
  status: string;
  playerCount: number;
  maxPlayers: number;
  createdAt: string;
  results: {
    winner: string;
    mvp: string;
    duration: number;
    sasRewards: number;
  } | null;
}

interface UserState {
  profile: UserProfile | null;
  wallet: WalletBalance | null;
  matches: UserMatch[];
  selectedArchetype: string | null;
  loading: boolean;
  error: string | null;
}

// Create async thunks
export const fetchUserProfile = createAsyncThunk(
  'user/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return rejectWithValue('Not authenticated');
      }
      
      const response = await axios.get(`${API_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data.user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch profile');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'user/updateUserProfile',
  async (profileData: { username?: string; archetypeId?: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return rejectWithValue('Not authenticated');
      }
      
      const response = await axios.put(
        `${API_URL}/user/profile`,
        profileData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      return response.data.user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update profile');
    }
  }
);

export const fetchWalletBalance = createAsyncThunk(
  'user/fetchWalletBalance',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return rejectWithValue('Not authenticated');
      }
      
      const response = await axios.get(`${API_URL}/user/wallet`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data.wallet;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch wallet balance');
    }
  }
);

export const fetchUserMatches = createAsyncThunk(
  'user/fetchUserMatches',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return rejectWithValue('Not authenticated');
      }
      
      const response = await axios.get(`${API_URL}/user/matches`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data.matches;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch matches');
    }
  }
);

// Initial state
const initialState: UserState = {
  profile: null,
  wallet: null,
  matches: [],
  selectedArchetype: null,
  loading: false,
  error: null
};

// Create slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setSelectedArchetype: (state, action: PayloadAction<string>) => {
      state.selectedArchetype = action.payload;
    },
    clearUserError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch user profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action: PayloadAction<UserProfile>) => {
        state.loading = false;
        state.profile = action.payload;
        state.selectedArchetype = action.payload.archetypeId;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update user profile
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action: PayloadAction<UserProfile>) => {
        state.loading = false;
        state.profile = action.payload;
        state.selectedArchetype = action.payload.archetypeId;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch wallet balance
      .addCase(fetchWalletBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalletBalance.fulfilled, (state, action: PayloadAction<WalletBalance>) => {
        state.loading = false;
        state.wallet = action.payload;
      })
      .addCase(fetchWalletBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch user matches
      .addCase(fetchUserMatches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserMatches.fulfilled, (state, action: PayloadAction<UserMatch[]>) => {
        state.loading = false;
        state.matches = action.payload;
      })
      .addCase(fetchUserMatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { setSelectedArchetype, clearUserError } = userSlice.actions;
export default userSlice.reducer; 