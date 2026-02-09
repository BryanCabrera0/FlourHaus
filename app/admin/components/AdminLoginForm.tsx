"use client";

import { FormEvent, useState } from "react";

type AdminLoginFormProps = {
  nextPath: string;
};

function getSafeNextPath(nextPath: string): string {
  if (!nextPath.startsWith("/admin")) {
    return "/admin";
  }
  return nextPath;
}

export default function AdminLoginForm({ nextPath }: AdminLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        setError(payload?.error ?? "Login failed.");
        return;
      }

      window.location.assign(getSafeNextPath(nextPath));
    } catch {
      setError("Unable to log in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel p-8">
      <p className="text-sm mb-6 text-fh-muted">Sign in to manage orders and menu items.</p>

      <div className="mb-4">
        <label className="admin-label">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="admin-input"
          placeholder="admin@flourhaus.com"
        />
      </div>

      <div className="mb-6">
        <label className="admin-label">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="admin-input"
        />
      </div>

      {error ? (
        <p className="feedback-error text-sm mb-4 p-3 rounded-lg">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary w-full py-3 text-sm disabled:opacity-50"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
