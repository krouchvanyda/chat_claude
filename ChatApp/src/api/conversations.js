import apiClient from './client';

/**
 * Conversation REST endpoint (see BACKEND.md):
 *   GET /api/conversations/{userId}
 *     -> conversations (participants + lastMessage populated), newest first
 */
export const fetchConversations = async userId => {
  try {
    const {data} = await apiClient.get(`/conversations/${userId}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.log('fetchConversations API error', error?.message);
    return [];
  }
};
