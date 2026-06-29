import {configureStore} from '@reduxjs/toolkit';
import authReducer from './authSlice';
import chatReducer from './chatSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      // message/conversation payloads from the socket may carry Date strings;
      // they are plain JSON so this is just to silence dev warnings if needed.
      serializableCheck: true,
    }),
});

export default store;
