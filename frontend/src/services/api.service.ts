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

  // Event endpoints
  static async getEvents() {
    return this.request('/events', {}, true);
  }

  static async createEvent(data: {
    title: string;
    description: string;
    date?: string | null;
    location?: string | null;
    budget?: number | null;
  }) {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  }

  static async voteEvent(eventId: string, value: 1 | -1) {
    return this.request(`/events/${eventId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    }, true);
  }

  static async updateEventStatus(eventId: string, status: 'PROPOSED' | 'IN_PLANNING' | 'COMPLETED') {
    return this.request(`/events/${eventId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, true);
  }

  static async deleteEvent(eventId: string) {
    return this.request(`/events/${eventId}`, { method: 'DELETE' }, true);
  }

  static async uploadEventPhoto(eventId: string, file: File) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('photo', file);
    const response = await fetch(`${API_URL}/events/${eventId}/photos`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // nginx returned HTML (e.g. 413 Too Large)
      if (response.status === 413) throw new Error('File too large (max 10 MB)');
      throw new Error(`Upload failed (HTTP ${response.status})`);
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload failed');
    return data;
  }

  static async deleteEventPhoto(eventId: string, photoId: string) {
    return this.request(`/events/${eventId}/photos/${photoId}`, { method: 'DELETE' }, true);
  }

  // Announcement endpoints
  static async getAnnouncements() {
    return this.request('/announcements', {}, true);
  }

  static async createAnnouncement(data: { title: string; content: string }) {
    return this.request('/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  }

  static async deleteAnnouncement(id: string) {
    return this.request(`/announcements/${id}`, { method: 'DELETE' }, true);
  }
}
