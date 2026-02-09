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
    <form onSubmit={handleSubmit} className="panel p-8 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-2" style={{ color: "#3D2B1F" }}>
        Owner Login
      </h1>
      <p className="text-sm mb-6" style={{ color: "#6B5740" }}>
        Sign in to manage orders and menu items.
      </p>

      <label className="block text-sm font-semibold mb-2" style={{ color: "#3D2B1F" }}>
        Email
      </label>
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full mb-4 rounded-xl border border-[#E4D5C8] bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D9B08C]"
      />

      <label className="block text-sm font-semibold mb-2" style={{ color: "#3D2B1F" }}>
        Password
      </label>
      <input
        type="password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="w-full mb-6 rounded-xl border border-[#E4D5C8] bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D9B08C]"
      />

      {error ? (
        <p className="text-sm mb-4 p-3 rounded-lg" style={{ color: "#A0555E", backgroundColor: "rgba(160, 85, 94, 0.08)" }}>
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
