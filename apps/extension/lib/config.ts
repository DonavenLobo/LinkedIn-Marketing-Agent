export const API_URL =
  import.meta.env.WXT_PROD_DEPLOY === "true"
    ? "https://linked-in-marketing-agent.vercel.app"
    : "http://localhost:3000";
