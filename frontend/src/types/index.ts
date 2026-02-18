// User types
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  balance: number;
  avatarUrl: string | null;
  createdAt?: string;
}

// Auth types
export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
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
