import { QueryClient } from "@tanstack/react-query";
import { auth } from "./firebase";
import { 
  ApiResponse, 
  ChatResponse, 
  ExpressionsResponse, 
  CategoriesResponse, 
  StatsResponse,
  InsertExpression,
  InsertCategory,
  InsertChatSession,
  InsertChatMessage,
  InsertUserStats,
  InsertAchievement
} from "../../../shared/schema";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://us-central1-conversation-practice-f2199.cloudfunctions.net/api";

// Error classes for better error handling
export class AuthenticationError extends Error {
  constructor(message: string = "User not authenticated") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class NetworkError extends Error {
  constructor(message: string = "Network request failed") {
    super(message);
    this.name = "NetworkError";
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Token refresh helper
async function getValidToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new AuthenticationError();
  }

  try {
    // Force token refresh if it's close to expiring
    return await user.getIdToken(true);
  } catch (error) {
    console.error("❌ Failed to get auth token:", error);
    throw new AuthenticationError("Failed to refresh authentication token");
  }
}

// Generate headers with Firebase auth token
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await getValidToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  } catch (error) {
    console.error("❌ Failed to get auth headers:", error);
    throw error;
  }
}

// Enhanced error handling
async function handleResponse(response: Response): Promise<any> {
  if (!response.ok) {
    let errorMessage: string;
    let errorCode: string | undefined;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
      errorCode = errorData.code;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    // Handle specific error types
    if (response.status === 401) {
      throw new AuthenticationError(errorMessage);
    } else if (response.status >= 500) {
      throw new NetworkError(`Server error: ${errorMessage}`);
    } else {
      throw new ApiError(errorMessage, response.status, errorCode);
    }
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (error) {
      console.error("JSON parsing error:", error);
      throw new NetworkError("Failed to parse response");
    }
  }

  return response;
}

// Main API request function with retry logic
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<any> {
  const maxRetries = 2;
  
  try {
    const authHeaders = await getAuthHeaders();
    const url = `${API_BASE_URL}${endpoint}`;
    
    console.log("🌐 API Request:", options.method || "GET", url);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
    });

    console.log("📥 Response status:", response.status, response.statusText);
    return await handleResponse(response);

  } catch (error) {
    // Retry logic for token expiration or network issues
    if (
      (error instanceof AuthenticationError || error instanceof NetworkError) &&
      retryCount < maxRetries
    ) {
      console.log(`🔄 Retrying request (${retryCount + 1}/${maxRetries})...`);
      return apiRequest(endpoint, options, retryCount + 1);
    }

    console.error("❌ API Request failed:", error);
    throw error;
  }
}

// Typed API functions with proper error handling and data extraction
export const api = {
  // Expression API
  expressions: {
    getAll: async () => {
      const response: ExpressionsResponse = await apiRequest('/expressions');
      return response.data || [];
    },
    
    create: (data: InsertExpression): Promise<ApiResponse> => 
      apiRequest('/expressions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: string, data: Partial<InsertExpression>): Promise<ApiResponse> => 
      apiRequest(`/expressions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string): Promise<ApiResponse> => 
      apiRequest(`/expressions/${id}`, {
        method: 'DELETE',
      }),
    
    getCategories: async () => {
      const response: CategoriesResponse = await apiRequest('/expressions/categories');
      return response.data || [];
    },
    
    createCategory: (data: InsertCategory): Promise<ApiResponse> => 
      apiRequest('/expressions/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Chat API
  chat: {
    startSession: (data: { selectedExpressions: string[] }): Promise<ApiResponse> => 
      apiRequest('/chat/start-session', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    respond: (data: { message: string; sessionId: string }): Promise<ChatResponse> => 
      apiRequest('/chat/respond', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getActiveSession: (): Promise<ApiResponse> => 
      apiRequest('/chat/active'),
    
    aiConversation: (data: { message: string; sessionId?: string }): Promise<ChatResponse> => 
      apiRequest('/chat/ai-conversation/respond', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    friendsScriptPreview: (data: { expressions: any[] }): Promise<ApiResponse> => 
      apiRequest('/friends-script/preview', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    friendsScriptPractice: (data: { 
      userInput: string; 
      expressions: any[] 
    }): Promise<ApiResponse> => 
      apiRequest('/friends-script/practice', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    friendsScriptEvaluate: (data: { 
      userResponse: string; 
      correctAnswer: string; 
      sessionId?: string 
    }): Promise<ChatResponse> => 
      apiRequest('/chat/friends-script/evaluate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getSessions: (): Promise<ApiResponse> => 
      apiRequest('/chat/sessions'),
    
    getSession: (id: string): Promise<ApiResponse> => 
      apiRequest(`/chat/sessions/${id}`),
    
    endSession: (id: string): Promise<ApiResponse> => 
      apiRequest(`/chat/sessions/${id}/end`, {
        method: 'PUT',
      }),
  },

  // Statistics API
  stats: {
    get: (): Promise<StatsResponse> => 
      apiRequest('/stats'),
    
    update: (data: Partial<InsertUserStats>): Promise<ApiResponse> => 
      apiRequest('/stats', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    getAchievements: (): Promise<ApiResponse> => 
      apiRequest('/stats/achievements'),
    
    createAchievement: (data: InsertAchievement): Promise<ApiResponse> => 
      apiRequest('/stats/achievements', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    getPracticeHistory: (params?: Record<string, string>): Promise<ApiResponse> => {
      const searchParams = params ? new URLSearchParams(params).toString() : '';
      return apiRequest(`/stats/practice-history${searchParams ? `?${searchParams}` : ''}`);
    },
    
    getExpressionStats: (): Promise<ApiResponse> => 
      apiRequest('/stats/expressions'),
  },

  // Authentication API
  auth: {
    getProfile: (): Promise<ApiResponse> => 
      apiRequest('/auth/profile'),
    
    updateProfile: (data: { 
      displayName?: string; 
      level?: 'beginner' | 'intermediate' | 'advanced';
      targetLanguage?: string;
      nativeLanguage?: string;
    }): Promise<ApiResponse> => 
      apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    deleteAccount: (): Promise<ApiResponse> => 
      apiRequest('/auth/account', {
        method: 'DELETE',
      }),
    
    verifyToken: async (token: string): Promise<ApiResponse> => {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      return handleResponse(response);
    },
  },
};

// React Query configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry authentication errors
        if (error instanceof AuthenticationError) {
          return false;
        }
        // Retry network errors up to 2 times
        if (error instanceof NetworkError && failureCount < 2) {
          return true;
        }
        return false;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry authentication errors or validation errors
        if (error instanceof AuthenticationError || 
            (error instanceof ApiError && error.status < 500)) {
          return false;
        }
        // Retry server errors once
        return failureCount < 1;
      },
    },
  },
});

// Legacy compatibility exports (to be removed after migration)
export const expressionsAPI = api.expressions;
export const chatAPI = api.chat;
export const statsAPI = api.stats;
export const authAPI = api.auth;