import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {fetchConversations} from '../api/conversations';

/**
 * Chat state:
 *   conversations   - list from GET /api/conversations/{userId}, newest first
 *   messagesByUser  - in-session message history keyed by the *other* user's id
 *                     (the backend has no REST message-history endpoint, so we
 *                     accumulate sent + received messages live via Socket.IO).
 */

export const loadConversations = createAsyncThunk(
  'chat/loadConversations',
  async userId => {
    const conversations = await fetchConversations(userId);
    return conversations;
  },
);

const idOf = entity => (entity == null ? entity : entity._id ?? entity);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    conversations: [],
    messagesByUser: {},
    status: 'idle',
  },
  reducers: {
    // Append a message to a peer's thread (used for both sent and received).
    addMessage: (state, action) => {
      const {otherUserId, message} = action.payload;
      const key = String(otherUserId);
      if (!state.messagesByUser[key]) {
        state.messagesByUser[key] = [];
      }
      state.messagesByUser[key].push(message);
    },
    // Replace a peer's thread with loaded history (GET /messages/{conversationId}).
    setMessages: (state, action) => {
      const {otherUserId, messages} = action.payload;
      state.messagesByUser[String(otherUserId)] = messages || [];
    },
    // Move/insert a conversation at the top of the list (socket update).
    upsertConversation: (state, action) => {
      const conversation = action.payload;
      if (!conversation) {
        return;
      }
      const cid = idOf(conversation);
      state.conversations = [
        conversation,
        ...state.conversations.filter(c => idOf(c) !== cid),
      ];
    },
    clearChat: state => {
      state.conversations = [];
      state.messagesByUser = {};
      state.status = 'idle';
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadConversations.pending, state => {
        state.status = 'loading';
      })
      .addCase(loadConversations.fulfilled, (state, action) => {
        state.conversations = action.payload;
        state.status = 'succeeded';
      })
      .addCase(loadConversations.rejected, state => {
        state.status = 'failed';
      });
  },
});

export const {addMessage, setMessages, upsertConversation, clearChat} =
  chatSlice.actions;
export default chatSlice.reducer;
