import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "LinkedIn Marketing Agent",
    description: "AI-powered LinkedIn content in your voice",
    permissions: ["tabs", "storage", "activeTab"],
    host_permissions: [
      "https://linked-in-marketing-agent.vercel.app/*",
      "https://www.linkedin.com/*"
    ],
  },
});
