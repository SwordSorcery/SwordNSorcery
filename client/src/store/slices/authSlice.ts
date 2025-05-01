import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import { sign } from 'tweetnacl';
import base58 from 'bs58';

// Define API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Define types
interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  nonceMessage: string | null;
}

interface WalletAuth {
  walletAddress: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    walletAddress: string;
    username: string;
    score: number;
    rank: string;
    archetypeId: string | null;
  };
}

// Create async thunks
export const getNonce = createAsyncThunk(
  'auth/getNonce',
  async (walletAddress: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/auth/nonce/${walletAddress}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get nonce');
    }
  }
);

export const verifyWallet = createAsyncThunk(
  'auth/verifyWallet',
  async (wallet: WalletAuth, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { nonceMessage } = state.auth;
      
      if (!nonceMessage) {
        return rejectWithValue('No nonce message found');
      }
      
      // Convert message to Uint8Array
      const messageBytes = new TextEncoder().encode(nonceMessage);
      
      // Sign message with wallet
      const signatureBytes = await wallet.signMessage(messageBytes);
      
      // Convert signature to base64
      const signature = Buffer.from(signatureBytes).toString('base64');
      
      // Verify signature on server
      const response = await axios.post(`${API_URL}/auth/verify`, {
        walletAddress: wallet.walletAddress,
        signature,
        signedMessage: nonceMessage
      });
      
      // Store token in localStorage
      localStorage.setItem('token', response.data.token);
      
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to verify wallet');
    }
  }
);

// Initial state
const initialState: AuthState = {
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
  nonceMessage: null
};

// Create slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.nonceMessage = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Get nonce
      .addCase(getNonce.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getNonce.fulfilled, (state, action: PayloadAction<{ nonce: string; message: string }>) => {
        state.loading = false;
        state.nonceMessage = action.payload.message;
      })
      .addCase(getNonce.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Verify wallet
      .addCase(verifyWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyWallet.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.loading = false;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(verifyWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer; 