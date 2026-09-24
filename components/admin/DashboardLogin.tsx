"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign in.");
      setPassword("");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="dashboard-login">
      <Link href="/" className="wordmark">
        BRAND PULSE<span> / 01</span>
      </Link>
      <p className="eyebrow">NIKE PERCEPTION STUDY</p>
      <h1>Research dashboard.</h1>
      <p>Enter the password to view responses and results.</p>
      <form onSubmit={submit}>
        <label htmlFor="dashboard-password">Password</label>
        <input
          id="dashboard-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? "Checking…" : "Open dashboard"} <span>→</span>
        </button>
      </form>
      <Link href="/">← Back to survey</Link>
    </main>
  );
}
