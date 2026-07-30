"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // If NextAuth ever redirects here with ?error=... (some error types
    // force a redirect even when the form uses signIn({ redirect: false })),
    // show a friendly message instead of a blank page or raw error code.
    if (searchParams.get("error")) {
      setError("Something went wrong signing in. Please try again.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password.");
    } else {
      const session = await getSession();
      const role = (session?.user as { role?: string } | undefined)?.role;
      if (role === "admin") router.push("/admin");
      else if (role === "principal") router.push("/principal");
      else router.push("/dashboard");
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-24 p-6 border rounded">
      <h1 className="text-xl font-bold mb-4">Teacher Login</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        {error && <p className="text-rose-600 text-sm">{error}</p>}
        <button type="submit" className="btn-primary w-full py-2">
          Log in
        </button>
      </form>
      <a href="/forgot-password" className="block text-sm text-sky-600 hover:underline mt-4">
        Forgot password?
      </a>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto mt-24 p-6">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
