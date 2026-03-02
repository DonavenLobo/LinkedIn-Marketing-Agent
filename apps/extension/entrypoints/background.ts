import { API_URL } from "../lib/config";

export default defineBackground(() => {
  console.log("LinkedIn Marketing Agent background script loaded");

  // Listen for auth callback tab
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url && changeInfo.url.includes("/auth/extension-done")) {
      try {
        const url = new URL(changeInfo.url);
        const accessToken = url.searchParams.get("access_token");
        const refreshToken = url.searchParams.get("refresh_token");

        if (accessToken && refreshToken) {
          chrome.storage.local.set({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          console.log("Auth tokens captured and stored");

          // Check if user needs onboarding
          fetch(`${API_URL}/api/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
            .then((res) => res.json())
            .then((data) => {
              if (!data.user?.onboarding_complete) {
                // Redirect the tab to onboarding instead of closing it
                chrome.tabs.update(tabId, {
                  url: `${API_URL}/onboarding`,
                });
              } else {
                chrome.tabs.remove(tabId);
              }
            })
            .catch(() => {
              // If check fails, just close the tab
              chrome.tabs.remove(tabId);
            });
        }
      } catch (e) {
        console.error("Failed to parse auth URL:", e);
      }
    }
  });
});
