import { auth } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://us-central1-daily-convo-app.cloudfunctions.net/api';

// API 요청 헬퍼 함수
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// 표현식 API
export const expressionsAPI = {
  getAll: () => apiRequest('/expressions'),
  create: (data: any) => apiRequest('/expressions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest(`/expressions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest(`/expressions/${id}`, {
    method: 'DELETE',
  }),
  getCategories: () => apiRequest('/expressions/categories'),
  createCategory: (data: any) => apiRequest('/expressions/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

// 채팅 API
export const chatAPI = {
  startSession: (data: any) => apiRequest('/chat/start-session', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  respond: (data: any) => apiRequest('/chat/respond', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  aiConversation: (data: any) => apiRequest('/chat/ai-conversation/respond', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  friendsScriptPreview: (data: any) => apiRequest('/chat/friends-script/preview', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  friendsScriptPractice: (data: any) => apiRequest('/chat/friends-script/practice', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  friendsScriptEvaluate: (data: any) => apiRequest('/chat/friends-script/evaluate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getSessions: () => apiRequest('/chat/sessions'),
  getSession: (id: string) => apiRequest(`/chat/sessions/${id}`),
  endSession: (id: string) => apiRequest(`/chat/sessions/${id}/end`, {
    method: 'PUT',
  }),
};

// 통계 API
export const statsAPI = {
  get: () => apiRequest('/stats'),
  update: (data: any) => apiRequest('/stats', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getAchievements: () => apiRequest('/stats/achievements'),
  createAchievement: (data: any) => apiRequest('/stats/achievements', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getPracticeHistory: (params?: any) => {
    const searchParams = new URLSearchParams(params);
    return apiRequest(`/stats/practice-history?${searchParams}`);
  },
  getExpressionStats: () => apiRequest('/stats/expressions'),
};

// 인증 API
export const authAPI = {
  getProfile: () => apiRequest('/auth/profile'),
  updateProfile: (data: any) => apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteAccount: () => apiRequest('/auth/account', {
    method: 'DELETE',
  }),
  verifyToken: (token: string) => fetch(`${API_BASE_URL}/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  }).then(res => res.json()),
};
