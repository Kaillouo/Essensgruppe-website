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
  createdAt: string;
  updatedAt: string;
  user: EventUser;
  userVote: number; // 1, -1, or 0
  photos: EventPhoto[];
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
