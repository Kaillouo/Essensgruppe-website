export type UserRole = 'ABI27' | 'ESSENSGRUPPE_MITGLIED' | 'ADMIN';

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  balance: number;
  reserved?: number; // sum of active prediction bet reservations
  avatarUrl: string | null;
  createdAt?: string;
  lastDailyClaim?: string;
}

// Auth types
export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  identifier: string; // username or email
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

// API Error type
export interface ApiError {
  error: string;
}

// Forum types
export interface PostUser {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  visibility: 'ALL' | 'ESSENSGRUPPE_ONLY';
  createdAt: string;
  updatedAt: string;
  user: PostUser;
  commentCount: number;
  voteScore: number;
  userVote: number; // 1, -1, or 0
}

export interface Comment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: PostUser;
  voteScore: number;
  userVote: number;
  replies: Comment[];
}

export interface PostDetail extends Post {
  comments: Comment[];
}

// Events types
export interface EventUser {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface EventPhoto {
  id: string;
  imageUrl: string;
  userId: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string | null;
  location: string | null;
  budget: number | null;
  status: 'PROPOSED' | 'IN_PLANNING' | 'COMPLETED';
  votes: number;
  visibility: 'ALL' | 'ESSENSGRUPPE_ONLY';
  createdAt: string;
  updatedAt: string;
  user: EventUser;
  userVote: number; // 1, -1, or 0
  photos: EventPhoto[];
}

// Chat types
export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface ChatContact {
  id: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    fromMe: boolean;
  } | null;
  unreadCount: number;
}

export interface ChatUser {
  id: string;
  username: string;
  avatarUrl: string | null;
}

// Mines game types
export interface MinesStartResponse {
  mineCount: number;
  totalTiles: number;
  revealedSafe: number[];
  multiplier: number;
  currentPayout: number;
  balance: number;
}

export interface MinesRevealResponse {
  isMine: boolean;
  revealedSafe: number[];
  minePositions?: number[];  // only present when game is over
  multiplier: number;
  currentPayout: number;
  balance?: number;          // only present when game is over
  status: 'PLAYING' | 'WON' | 'LOST';
}

export interface MinesCashoutResponse {
  payout: number;
  balance: number;
  minePositions: number[];
  revealedSafe: number[];
  multiplier: number;
}

// Notification types
export type NotificationType =
  | 'ADMIN_BROADCAST'
  | 'NEW_POST'
  | 'NEW_PREDICTION'
  | 'PREDICTION_CLOSED'
  | 'PREDICTION_REMINDER'
  | 'NEW_EVENT'
  | 'EVENT_STATUS_CHANGED'
  | 'DAILY_COINS'
  | 'NEW_MESSAGE';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreference {
  newPost: boolean;
  newPrediction: boolean;
  predictionClosed: boolean;
  predictionReminder: boolean;
  newEvent: boolean;
  eventStatusChanged: boolean;
  dailyCoins: boolean;
  newMessage: boolean;
}

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  blocked: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

// Announcement types
export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: EventUser;
}
