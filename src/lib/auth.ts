const TOKEN_KEY = 'medipal_access_token';
const USER_KEY = 'medipal_user';

export interface StoredUser {
  id: string;
  email: string;
  role: string;
}

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAccessToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAccessToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getStoredUser = (): StoredUser | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: StoredUser): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearStoredUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

export const clearSession = (): void => {
  clearAccessToken();
  clearStoredUser();
};

export const parseApiError = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const errorBody = await response.json().catch(() => null);
  if (typeof errorBody?.detail === 'string') {
    return errorBody.detail;
  }
  return fallback;
};

export const authHeaders = (): HeadersInit => {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

export const fetchToken = async (email: string, password: string): Promise<string> => {
  const body = new URLSearchParams();
  body.append('username', email);
  body.append('password', password);

  const response = await fetch('/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const detail = await parseApiError(response, 'Invalid credentials');
    throw new Error(
      detail === 'Incorrect username or password' ? 'Invalid credentials' : detail,
    );
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('No access token returned from server.');
  }

  return data.access_token;
};

export const fetchCurrentUser = async (token: string): Promise<StoredUser> => {
  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to load user profile.');
  }

  const data = await response.json();
  return {
    id: data.id,
    email: data.email,
    role: data.role,
  };
};
