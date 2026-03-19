"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("claude-uni-user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      <div className="space-y-6">
        <div className="p-6 border border-[var(--border)] rounded-xl">
          <h2 className="font-semibold mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted-foreground)]">Email</span>
              <span>{user?.email || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted-foreground)]">Plan</span>
              <span className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-xs font-medium">
                Free
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 border border-[var(--border)] rounded-xl">
          <h2 className="font-semibold mb-2">Upgrade to Pro</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Unlimited courses, unlimited messages, priority support.
          </p>
          <div className="text-2xl font-bold mb-4">
            ₩9,900<span className="text-sm font-normal text-[var(--muted-foreground)]">/month</span>
          </div>
          <button className="w-full py-2.5 bg-[var(--foreground)] text-[var(--background)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Coming soon
          </button>
        </div>
      </div>
    </div>
  );
}
