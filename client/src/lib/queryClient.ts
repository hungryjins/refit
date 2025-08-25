import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://us-central1-daily-convo-app.cloudfunctions.net/api";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Generate headers with Firebase auth token
async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Overloaded apiRequest function
export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  }
): Promise<any>;
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response>;
export async function apiRequest(
  urlOrMethod: string,
  urlOrOptions?:
    | string
    | { method?: string; body?: string; headers?: Record<string, string> },
  data?: unknown | undefined
): Promise<any> {
  let url: string;
  let method: string;
  let body: string | undefined;
  let headers: Record<string, string> = {};

  if (typeof urlOrOptions === "string") {
    // apiRequest(method, url, data) form
    method = urlOrMethod;
    url = urlOrOptions;
    if (data) {
      body = JSON.stringify(data);
      headers["Content-Type"] = "application/json";
    }
  } else {
    // apiRequest(url, options) form
    url = urlOrMethod;
    const options = urlOrOptions || {};
    method = options.method || "GET";
    body = options.body;
    headers = { ...headers, ...options.headers };
  }

  // Convert to Firebase Functions URL
  const firebaseUrl = url.startsWith("/api/")
    ? `${API_BASE_URL}${url.replace("/api", "")}`
    : url;

  // Add auth headers
  const authHeaders = await getAuthHeaders();
  const finalHeaders = { ...authHeaders, ...headers };

  const res = await fetch(firebaseUrl, {
    method,
    headers: finalHeaders,
    body,
  });

  await throwIfResNotOk(res);

  // Parse and return JSON response
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch (error) {
      console.error("JSON parsing error:", error);
      console.error("Response:", res);
      throw new Error("Failed to parse JSON response");
    }
  }

  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const firebaseUrl = url.startsWith("/api/")
      ? `${API_BASE_URL}${url.replace("/api", "")}`
      : url;

    const authHeaders = await getAuthHeaders();

    const res = await fetch(firebaseUrl, {
      headers: authHeaders,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
