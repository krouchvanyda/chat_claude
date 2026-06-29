import {io} from 'socket.io-client';
import {SOCKET_URL} from '../config';

/**
 * Thin wrapper around a single Socket.IO connection (see BACKEND.md, port 5002).
 *
 * Handshake auth carries the numeric userId; the server then auto-joins the
 * client to its personal room. Events:
 *   emit  'join'               -> otherUserId (open a chat / join their room)
 *   emit  'send-message'       -> { otherUserId, text }
 *   emit  'focus-conversation' -> conversationId (reset unread to 0)
 *   on    'receive-message'    <- { message, conversation, isNew }
 *
 * `receive-message` subscribers are kept in a module-level Set, independent of
 * the socket's lifecycle. A screen can subscribe *before* the socket connects
 * (e.g. ChatsScreen mounts before App.js runs connectSocket) and still receive
 * events; subscriptions also survive reconnects. The single underlying
 * socket.on('receive-message') below just fans out to every subscriber.
 */
let socket = null;
const receiveHandlers = new Set();

const fanOutReceiveMessage = payload => {
  receiveHandlers.forEach(handler => {
    try {
      handler(payload);
    } catch (err) {
      console.log('receive-message handler error', err?.message);
    }
  });
};

export const connectSocket = userId => {
  if (socket && socket.connected) {
    return socket;
  }
  // userId must be numeric for the backend.
  const numericId = Number(userId);

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: {userId: numericId},
    query: {userId: numericId},
    forceNew: true,
  });

  socket.on('connect', () => console.log('Socket connected', socket.id));
  socket.on('disconnect', reason => console.log('Socket disconnected', reason));
  socket.on('connect_error', err =>
    console.log('Socket connect_error', err?.message),
  );

  // Single listener that fans out to all current subscribers. Re-attached on
  // every (re)connect since disconnectSocket() removes all socket listeners.
  socket.on('receive-message', fanOutReceiveMessage);

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  // Note: receiveHandlers are intentionally kept — screens add/remove their own
  // via the unsubscribe returned by onReceiveMessage().
};

// --- Emitters -------------------------------------------------------------

export const joinChat = otherUserId => {
  socket?.emit('join', String(otherUserId));
};

export const sendMessage = (otherUserId, text) => {
  socket?.emit('send-message', {otherUserId, text});
};

export const focusConversation = conversationId => {
  socket?.emit('focus-conversation', String(conversationId));
};

// --- Listeners ------------------------------------------------------------

export const onReceiveMessage = handler => {
  // Subscribe regardless of whether the socket exists yet; the persistent
  // socket.on('receive-message') above dispatches to this Set once connected.
  receiveHandlers.add(handler);
  // return an unsubscribe so callers can clean up on unmount.
  return () => receiveHandlers.delete(handler);
};
