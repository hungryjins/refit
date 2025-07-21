import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// 오버로드된 apiRequest 함수
export async function apiRequest(url: string, options?: {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}): Promise<any>;
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response>;
export async function apiRequest(
  urlOrMethod: string,
  urlOrOptions?: string | { method?: string; body?: string; headers?: Record<string, string> },
  data?: unknown | undefined,
): Promise<any> {
  let url: string;
  let method: string;
  let body: string | undefined;
  let headers: Record<string, string> = {};

  if (typeof urlOrOptions === 'string') {
    // apiRequest(method, url, data) 형태
    method = urlOrMethod;
    url = urlOrOptions;
    if (data) {
      body = JSON.stringify(data);
      headers["Content-Type"] = "application/json";
    }
  } else {
    // apiRequest(url, options) 형태
    url = urlOrMethod;
    const options = urlOrOptions || {};
    method = options.method || 'GET';
    body = options.body;
    headers = { ...headers, ...options.headers };
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // JSON 응답인 경우 파싱해서 반환
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch (error) {
      console.error('JSON parsing error:', error);
      console.error('Response:', res);
      throw new Error('Failed to parse JSON response');
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
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
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
