const API_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiService {
  private static getHeaders(includeAuth: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requiresAuth: boolean = false
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const headers = this.getHeaders(requiresAuth);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth endpoints
  static async register(credentials: { username: string; password: string }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  static async login(credentials: { username: string; password: string }) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // User endpoints
  static async getProfile() {
    return this.request('/users/me', {}, true);
  }

  static async updateProfile(data: { username?: string; email?: string }) {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true);
  }

  static async changePassword(data: { currentPassword: string; newPassword: string }) {
    return this.request('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  }

  static async deleteAccount() {
    return this.request('/users/me', {
      method: 'DELETE',
    }, true);
  }

  static async getTransactions() {
    return this.request('/users/me/transactions', {}, true);
  }

  static async getGameHistory() {
    return this.request('/users/me/games', {}, true);
  }

  // Admin endpoints
  static async getUsers() {
    return this.request('/admin/users', {}, true);
  }

  static async getPendingUsers() {
    return this.request('/admin/users/pending', {}, true);
  }

  static async approveUser(userId: string) {
    return this.request(`/admin/users/${userId}/approve`, { method: 'PATCH' }, true);
  }

  static async denyUser(userId: string) {
    return this.request(`/admin/users/${userId}/deny`, { method: 'PATCH' }, true);
  }

  static async banUser(userId: string) {
    return this.request(`/admin/users/${userId}/ban`, { method: 'PATCH' }, true);
  }

  static async unbanUser(userId: string) {
    return this.request(`/admin/users/${userId}/unban`, { method: 'PATCH' }, true);
  }

  static async createUser(data: { username: string; email: string; password: string; role?: string }) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  }

  static async deleteUser(userId: string) {
    return this.request(`/admin/users/${userId}`, {
      method: 'DELETE',
    }, true);
  }

  static async resetPassword(userId: string, newPassword: string) {
    return this.request(`/admin/users/${userId}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    }, true);
  }

  static async setBalance(userId: string, amount: number, reason?: string) {
    return this.request(`/admin/users/${userId}/balance`, {
      method: 'PATCH',
      body: JSON.stringify({ amount, mode: 'set', reason }),
    }, true);
  }

  static async adjustBalance(userId: string, amount: number, reason?: string) {
    return this.request(`/admin/users/${userId}/balance`, {
      method: 'PATCH',
      body: JSON.stringify({ amount, mode: 'adjust', reason }),
    }, true);
  }

  static async getAnalytics() {
    return this.request('/admin/analytics', {}, true);
  }

  // Forum endpoints
  static async getPosts(sort: string = 'new', search?: string) {
    const params = new URLSearchParams({ sort });
    if (search) params.set('search', search);
    return this.request(`/posts?${params.toString()}`, {}, true);
  }

  static async getPost(id: string) {
    return this.request(`/posts/${id}`, {}, true);
  }

  static async createPost(data: { title: string; content: string; imageUrl?: string }) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  }

  static async updatePost(id: string, data: { title?: string; content?: string }) {
    return this.request(`/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true);
  }

  static async deletePost(id: string) {
    return this.request(`/posts/${id}`, { method: 'DELETE' }, true);
  }

  static async createComment(postId: string, data: { content: string; parentCommentId?: string }) {
    return this.request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  }

  static async deleteComment(commentId: string) {
    return this.request(`/posts/comments/${commentId}`, { method: 'DELETE' }, true);
  }

  static async votePost(postId: string, value: 1 | -1) {
    return this.request(`/posts/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    }, true);
  }

  static async voteComment(commentId: string, value: 1 | -1) {
    return this.request(`/posts/comments/${commentId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    }, true);
  }
}
