import {API_URL} from '../config';

const DEFAULT_AVATAR =
  'https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png';

// Origin that serves uploaded files = API_URL without the trailing "/api".
const FILE_BASE = API_URL.replace(/\/api\/?$/, '');

// Normalise a profileImage into something <Image> can load. The backend is
// inconsistent: GET /users returns an absolute URL, but POST/PUT and the
// conversation populate return a server-relative path like "/uploads/xyz.jpg".
// Also pass through locally-picked "file://" images unchanged.
const resolveImageUrl = uri => {
  if (!uri) {
    return null;
  }
  if (/^(https?:|file:)/i.test(uri)) {
    return uri;
  }
  if (uri.startsWith('/')) {
    return `${FILE_BASE}${uri}`;
  }
  return uri;
};

const sameId = (a, b) => String(a) === String(b);

// Pick the participant that isn't the current user.
export const getOtherParticipant = (conversation, currentUserId) => {
  const participants = conversation?.participants || [];
  return (
    participants.find(p => !sameId(p?._id, currentUserId)) ||
    participants[0] ||
    null
  );
};

export const avatarUri = user =>
  resolveImageUrl(user?.profileImage) || DEFAULT_AVATAR;

// Unread count for the current user (backend exposes a userId -> count map).
export const unreadFor = (conversation, currentUserId) => {
  const counts = conversation?.unreadCounts || {};
  return Number(counts[currentUserId] || counts[String(currentUserId)] || 0);
};

export const lastMessageText = conversation =>
  conversation?.lastMessage?.text || '';

// Format an ISO/date string to a short HH:MM label; tolerate missing/invalid.
export const formatTime = value => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
};
