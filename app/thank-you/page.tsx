import Link from "next/link";
export default function Thanks() {
  return (
    <main className="survey intro">
      <span className="eyebrow">BRAND PULSE / COMPLETE</span>
      <h1>
        Done<span className="accent-dot">.</span>
      </h1>
      <p className="intro-copy">Thanks for the instinctive take.</p>
      <p className="hint">Your response has been saved.</p>
      <Link href="/privacy">Privacy</Link>
    </main>
  );
}
