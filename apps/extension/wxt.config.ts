import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "LinkedIn Marketing Agent",
    description: "AI-powered LinkedIn content in your voice",
    permissions: ["tabs", "storage"],
    host_permissions: [
      "https://linked-in-marketing-agent.vercel.app/*",
      "https://www.linkedin.com/*"
    ],
    web_accessible_resources: [
      {
        resources: [
          "elevenlabs-worklets/rawAudioProcessor.js",
          "elevenlabs-worklets/audioConcatProcessor.js"
        ],
        matches: ["https://www.linkedin.com/*"],
      },
    ],
  },
});
