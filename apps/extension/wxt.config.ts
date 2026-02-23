import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "LinkedIn Marketing Agent",
    description: "AI-powered LinkedIn content in your voice",
    permissions: ["tabs", "storage", "activeTab"],
    host_permissions: [
      "http://localhost:3000/*",
      "https://www.linkedin.com/*"
    ],
  },
});
