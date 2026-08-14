"use client";

import { FormEvent, useState } from "react";
import { login, register } from "@/lib/api";
import { AuthState } from "@/lib/types";

interface AuthPanelProps {
  auth: AuthState | null;
  onSignIn: (auth: AuthState) => void;
  onSignOut: () => void;
}

export default function AuthPanel({
  auth,
  onSignIn,
  onSignOut,
}: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (auth) {
    return (
      <div className="auth-panel">
        <span>
          Signed in as <strong>{auth.user.displayName}</strong>
        </span>
        <button type="button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await login({ email, password })
          : await register({ email, password, displayName });
      onSignIn(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-panel" onSubmit={handleSubmit}>
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "login" ? "active" : ""}
          onClick={() => setMode("login")}
        >
          Log in
        </button>
        <button
          type="button"
          className={mode === "register" ? "active" : ""}
          onClick={() => setMode("register")}
        >
          Register
        </button>
      </div>

      {mode === "register" && (
        <input
          type="text"
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      )}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
      />
      <button type="submit" disabled={loading}>
        {loading
          ? "Please wait..."
          : mode === "login"
            ? "Log in"
            : "Create account"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
