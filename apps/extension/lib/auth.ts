const API_URL = "http://localhost:3000";

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

export function getLoginUrl(): string {
  return `${API_URL}/auth/login?from=extension`;
}
