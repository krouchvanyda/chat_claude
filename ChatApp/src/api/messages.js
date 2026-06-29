import apiClient from './client';

/**
 * Message history endpoint (see BACKEND.md):
 *   GET /api/messages/{conversationId} -> messages for the thread, oldest first.
 *
 * Each message is the backend Message shape: { _id, conversationId, senderId,
 * text, createdAt, ... }.
 */
export const fetchMessages = async conversationId => {
  try {
    const {data} = await apiClient.get(`/messages/${conversationId}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.log('fetchMessages API error', error?.message);
    return [];
  }
};
