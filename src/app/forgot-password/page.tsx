"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div className="max-w-sm mx-auto mt-24 p-6 border rounded">
      <h1 className="text-xl font-bold mb-4">Forgot Password</h1>
      {submitted ? (
        <p className="text-sm text-slate-600">
          If an account exists with that email, a reset link has been generated. The account
          owner can find it in the server logs (Railway → Deploy Logs) since email sending isn't
          set up yet - search for "Password reset requested."
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-slate-500">
            Enter your account email and we'll generate a reset link.
          </p>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <button type="submit" disabled={loading} className="btn-primary w-full py-2">
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}
      <a href="/login" className="block text-sm text-sky-600 hover:underline mt-4">
        ← Back to login
      </a>
    </div>
  );
}
