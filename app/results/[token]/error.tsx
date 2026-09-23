"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="survey">
      <h1>Couldn’t load the results.</h1>
      <p>Check the data connection, then try again.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
