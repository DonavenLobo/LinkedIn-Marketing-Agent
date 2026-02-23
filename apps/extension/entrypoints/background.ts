export default defineBackground(() => {
  console.log("LinkedIn Marketing Agent background script loaded");

  // Listen for auth callback tab
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
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
          // Close the auth tab
          chrome.tabs.remove(tabId);
          console.log("Auth tokens captured and stored");
        }
      } catch (e) {
        console.error("Failed to parse auth URL:", e);
      }
    }
  });
});
