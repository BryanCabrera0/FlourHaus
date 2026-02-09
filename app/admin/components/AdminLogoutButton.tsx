"use client";

import { useState } from "react";

export default function AdminLogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.assign("/admin/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="btn-admin-logout text-xs py-2 px-4 disabled:opacity-50"
    >
      {isLoggingOut ? "Signing out..." : "Sign out"}
    </button>
  );
}
