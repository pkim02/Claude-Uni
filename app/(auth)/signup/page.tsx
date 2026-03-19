"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // MVP: Simple demo signup
    if (email && password && name) {
      localStorage.setItem(
        "claude-uni-user",
        JSON.stringify({ email, id: "demo-user", name })
      );
      router.push("/dashboard");
    } else {
      setError("Please fill in all fields.");
    }
    setLoading(false);
  }

  function handleDemoLogin() {
    localStorage.setItem(
      "claude-uni-user",
      JSON.stringify({ email: "demo@claude.university", id: "demo-user", name: "Demo Student" })
    );
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[var(--background)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <GraduationCap className="w-8 h-8 text-brand-500" />
            <span className="text-xl font-semibold">Claude University</span>
          </Link>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Start learning smarter in 60 seconds
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-shadow"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-shadow"
              placeholder="you@university.edu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition-shadow"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[var(--foreground)] text-[var(--background)] py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-sm text-[var(--muted-foreground)]">or</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <button
          onClick={handleDemoLogin}
          className="w-full py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-[var(--muted)] transition-colors"
        >
          Try demo without signing up
        </button>

        <p className="text-center text-sm text-[var(--muted-foreground)] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-600 hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
