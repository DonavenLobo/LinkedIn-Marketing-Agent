import { API_URL } from "./config";

export async function getTokens(): Promise<{
  access_token: string | null;
  refresh_token: string | null;
}> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["access_token", "refresh_token"], (result) => {
      resolve({
        access_token: result.access_token || null,
        refresh_token: result.refresh_token || null,
      });
    });
  });
}

export async function clearTokens(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(["access_token", "refresh_token"], resolve);
  });
}

/**
 * Exchange the stored refresh_token for a fresh access_token.
 * Returns the new access_token on success, null on failure (clears storage if refresh is rejected).
 */
export async function refreshTokens(): Promise<string | null> {
  const { refresh_token } = await getTokens();
  if (!refresh_token) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });

    if (!res.ok) {
      // Refresh token is invalid or expired — clear stored tokens so the
      // extension shows the login screen instead of looping on 401s.
      await clearTokens();
      return null;
    }

    const { access_token, refresh_token: new_refresh_token } = await res.json();

    await new Promise<void>((resolve) => {
      chrome.storage.local.set(
        { access_token, refresh_token: new_refresh_token },
        resolve
      );
    });

    return access_token;
  } catch {
    return null;
  }
}

export function getLoginUrl(): string {
  return `${API_URL}/auth/login?from=extension`;
}
