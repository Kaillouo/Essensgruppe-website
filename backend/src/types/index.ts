import { Request } from 'express';

export type UserRole = 'ABI27' | 'ESSENSGRUPPE_MITGLIED' | 'ADMIN';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
  };
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  identifier: string; // username or email
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    balance: number;
    avatarUrl: string | null;
    lastDailyClaim?: string | null;
  };
}

export interface UpdateProfileDto {
  username?: string;
  email?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
