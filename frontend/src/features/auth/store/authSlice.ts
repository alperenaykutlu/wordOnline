import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../api/authApi';
import { secureStorage } from '../../../shared/utils/secureStorage';

export interface AuthState {
  isAuthenticated: boolean;
  userId:          string | null;
  username:        string | null;
  role:            string | null;
  accessToken:     string | null;
  loading:         boolean;
  error:           string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  userId:          null,
  username:        null,
  role:            null,
  accessToken:     null,
  loading:         false,
  error:           null,
};

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (idToken: string, { rejectWithValue }) => {
    try {
      const result = await authApi.googleLogin(idToken);
      await secureStorage.set('accessToken', result.accessToken);
      await secureStorage.set('userId', result.userId);
      return result;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Giriş başarısız.');
    }
  }
);

export const refreshTokens = createAsyncThunk(
  'auth/refresh',
  async (_, { rejectWithValue }) => {
    try {
      const result = await authApi.refresh();
      await secureStorage.set('accessToken', result.accessToken);
      return result;
    } catch (err: any) {
      return rejectWithValue('Oturum süresi doldu.');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  try { await authApi.logout(); } catch {}
  await secureStorage.clear();
  dispatch(authSlice.actions.reset());
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    reset: () => initialState,
    setAccessToken: (state, action) => { state.accessToken = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(googleLogin.pending,   (state)         => { state.loading = true;  state.error = null; })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.loading        = false;
        state.isAuthenticated= true;
        state.userId         = action.payload.userId;
        state.username       = action.payload.username;
        state.role           = (action.payload as any).role ?? 'Player';
        state.accessToken    = action.payload.accessToken;
      })
      .addCase(googleLogin.rejected,  (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(refreshTokens.fulfilled, (state, action) => { state.accessToken = action.payload.accessToken; })
      .addCase(refreshTokens.rejected,  (state)         => { Object.assign(state, initialState); });
  },
});

export const { reset, setAccessToken } = authSlice.actions;
export default authSlice.reducer;
