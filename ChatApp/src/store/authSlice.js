import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {getUser, saveUser, removeUser} from '../utils/storage';

/**
 * Auth state holds the logged-in user (persisted in AsyncStorage).
 * The user object mirrors the backend shape: { _id, name, phone, profileImage }.
 */

export const loadUserFromStorage = createAsyncThunk(
  'auth/loadUser',
  async () => {
    const user = await getUser();
    return user;
  },
);

export const setUser = createAsyncThunk('auth/setUser', async user => {
  await saveUser(user);
  return user;
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await removeUser();
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    bootstrapped: false, // becomes true once storage has been checked
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadUserFromStorage.fulfilled, (state, action) => {
        state.user = action.payload || null;
        state.bootstrapped = true;
      })
      .addCase(loadUserFromStorage.rejected, state => {
        state.bootstrapped = true;
      })
      .addCase(setUser.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(logout.fulfilled, state => {
        state.user = null;
      });
  },
});

export default authSlice.reducer;
