import { getLoginUrl } from "../../lib/auth";

export function AuthGate() {
  const handleLogin = () => {
    window.open(getLoginUrl(), "_blank");
  };

  return (
    <div className="auth-gate">
      <h2>Welcome!</h2>
      <p>Sign in to start generating LinkedIn posts in your voice.</p>
      <button className="btn-primary" onClick={handleLogin}>
        Get Started
      </button>
    </div>
  );
}
