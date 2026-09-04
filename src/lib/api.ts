import { auth } from "./firebase";

/**
 * Returns authorization headers including the current user's Firebase ID token.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.warn("Could not retrieve Firebase ID token:", err);
  }

  return headers;
}

/**
 * Wrapper for authenticated API fetch calls
 */
export async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const mergedHeaders = {
    ...authHeaders,
    ...(options.headers || {}),
  };

  return fetch(endpoint, {
    ...options,
    headers: mergedHeaders,
  });
}
