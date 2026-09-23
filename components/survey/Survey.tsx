"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  questions,
  interests,
  attributes,
  feelingOptions,
  brands,
  recentPurchaseBrands,
  purchaseReasons,
  tiers,
  tierLabels,
  VERSION,
  type Brand,
  type Tier,
} from "@/lib/survey-config";
import { countries } from "@/lib/countries";
import { submissionSchema, type Submission } from "@/lib/validation";
type Draft = Partial<Submission>;
const storage = "nike-pulse-unfinished-v1.4";
export function NumericScale({
  value,
  onChange,
  label,
  left,
  middle = "In between",
  right,
}: {
  value?: number;
  onChange: (v: number) => void;
  label: string;
  left?: string;
  middle?: string;
  right?: string;
}) {
  return (
    <div className="score-slider">
      <div className="score-value" aria-live="polite">
        <strong>{value ?? "—"}</strong>
        <span>/ 10</span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value ?? 5}
        className={value === undefined ? "unanswered" : ""}
        style={{ "--score-fill": `${(value ?? 0) * 10}%` } as CSSProperties}
        aria-label={label}
        aria-valuetext={
          value === undefined ? "Not selected" : `${value} out of 10`
        }
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={(e) => onChange(Number(e.currentTarget.value))}
      />
      <div className="score-anchors">
        <span>0 · {left}</span>
        <span>5 · {middle}</span>
        <span>10 · {right}</span>
      </div>
    </div>
  );
}
function TierList({
  value = {},
  onChange,
}: {
  value?: Partial<Record<Brand, Tier>>;
  onChange: (v: Record<Brand, Tier>) => void;
}) {
  const [active, setActive] = useState<Brand | null>(null);
  function place(tier: Tier, brand = active) {
    if (brand) {
      onChange({ ...value, [brand]: tier } as Record<Brand, Tier>);
      setActive(null);
    }
  }
  return (
    <div>
      <p className="hint">
        Select a brand, then a tier. You can also drag.{" "}
        {Object.keys(value).length}/{brands.length} placed.
      </p>
      <div className="brand-bank">
        {brands.map((b) => (
          <button
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", b);
              setActive(b);
            }}
            aria-pressed={active === b}
            className={`brand ${active === b ? "selected" : ""}`}
            onClick={() => setActive(b)}
            key={b}
          >
            {b}
            {value[b] && <small> {value[b]}</small>}
          </button>
        ))}
      </div>
      <div className="tiers">
        {tiers.map((t, i) => (
          <button
            key={t}
            aria-label={`Place selected brand in ${t}: ${tierLabels[i]}`}
            className={`tier tier-${i}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const b = e.dataTransfer.getData("text/plain");
              if (brands.includes(b as Brand)) place(t, b as Brand);
            }}
            onClick={() => place(t)}
          >
            <strong>{t}</strong>
            <span className="tier-name">{tierLabels[i]}</span>
            <span className="placed">
              {brands
                .filter((b) => value[b] === t)
                .map((b) => (
                  <motion.span layout key={b}>
                    {b}
                  </motion.span>
                ))}
            </span>
          </button>
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        {active
          ? `${active} selected. Choose a tier.`
          : `${Object.keys(value).length} brands placed`}
      </span>
    </div>
  );
}
export default function Survey({ demo }: { demo: boolean }) {
  const [draft, setDraft] = useState<Draft>({});
  const [step, setStep] = useState(-1);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const reduced = useReducedMotion();
  const router = useRouter();
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  // Restore browser-owned state after hydration; the server cannot read localStorage.
  useEffect(() => {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(storage) || "null");
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(
      saved?.draft?.survey_version === VERSION
        ? saved.draft
        : {
            session_id: crypto.randomUUID(),
            survey_version: VERSION,
            started_at: new Date().toISOString(),
            perception_change_reasons: [],
          },
    );
    setStep(
      saved?.draft?.survey_version === VERSION &&
        Number.isInteger(saved?.step) &&
        saved.step >= -1 &&
        saved.step < questions.length
        ? saved.step
        : -1,
    );
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(storage, JSON.stringify({ draft, step }));
      } catch {
        /* Storage may be disabled; the in-memory survey still works. */
      }
    }
  }, [draft, step, ready]);
  function set(key: string, value: unknown) {
    setError("");
    setDraft((d) => ({
      ...d,
      [key]: value,
      ...(key === "nike_weaknesses" &&
      !((value as string[]) || []).includes(d.priority_weakness || "")
        ? { priority_weakness: undefined }
        : {}),
      ...(key === "perception_change" && value === 5
        ? { perception_change_reasons: [], perception_change_other: "" }
        : {}),
    }));
  }
  const q = questions[Math.max(0, step)];
  const value = draft[q.id as keyof Submission];
  function valid() {
    if (q.type === "interests")
      return interests.every(([k]) => typeof draft[k] === "number");
    if (q.type === "attributes")
      return attributes.every(({ key }) => typeof draft[key] === "number");
    if (q.type === "pairedScale")
      return q.prompts.every(({ key }) => typeof draft[key] === "number");
    if (q.type === "tiers") return brands.every((b) => draft.brand_tiers?.[b]);
    if (q.type === "recentPurchase")
      return (
        !!draft.recent_purchase_brand &&
        (draft.recent_purchase_brand === "No recent purchase" ||
          !!draft.recent_purchase_reason)
      );
    if (q.type === "feelingChoices")
      return (
        feelingOptions.some((o) => o === draft.nike_used_to_feel) &&
        feelingOptions.some((o) => o === draft.nike_today_feels)
      );
    if (q.type === "chips")
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        (q.id !== "nike_weaknesses" ||
          (!!draft.priority_weakness &&
            (value as string[]).includes(draft.priority_weakness)))
      );
    if (q.type === "textarea") return true;
    return value !== undefined && String(value).trim() !== "";
  }
  async function next() {
    if (busy) return;
    if (!valid()) {
      setError("Make your selection to continue.");
      return;
    }
    if (step < questions.length - 1) {
      setStep(
        (s) =>
          s +
          (q.id === "perception_pair" && draft.perception_change === 5 ? 2 : 1),
      );
      return;
    }
    if (lock.current) return;
    const parsed = submissionSchema.safeParse(draft);
    if (!parsed.success) {
      setError("Please check all answers. " + parsed.error.issues[0].message);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const data = await res.json();
        throw Error(data.error);
      }
      try {
        localStorage.removeItem(storage);
      } catch {}
      router.push("/thank-you");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit. Try again.");
      lock.current = false;
      setBusy(false);
    }
  }
  function back() {
    setError("");
    setStep(
      (s) =>
        s -
        (questions[s - 1]?.id === "perception_change_reasons" &&
        draft.perception_change === 5
          ? 2
          : 1),
    );
  }
  if (!ready)
    return (
      <main className="survey">
        <div className="skeleton" aria-label="Loading survey" />
      </main>
    );
  return (
    <div className="survey-page">
      <header className="survey-header">
        <Link href="/" className="wordmark">
          BRAND PULSE<span> / 01</span>
        </Link>
        <span className="eyebrow">INDEPENDENT RESEARCH</span>
      </header>
      {demo && (
        <div className="demo-strip">
          Development demo · Synthetic responses · Not collecting real research
          data
        </div>
      )}
      <div
        className="progress"
        role="progressbar"
        aria-label="Survey progress"
        aria-valuenow={Math.max(0, step)}
        aria-valuemin={0}
        aria-valuemax={questions.length}
      >
        <span
          style={{ width: `${(Math.max(0, step) / questions.length) * 100}%` }}
        />
      </div>
      <main className={`survey ${step === -1 ? "intro" : ""}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            onAnimationComplete={() =>
              heading.current?.focus({ preventScroll: true })
            }
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -8 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
          >
            {step === -1 ? (
              <>
                <div className="eyebrow intro-kicker">
                  A QUICK, INSTINCTIVE BRAND PULSE
                </div>
                <h1>
                  What does Nike
                  <br />
                  feel like <em>today?</em>
                </h1>
                <p className="intro-copy">
                  No right answers. No Nike expertise needed.
                  <br />
                  Go with your first reaction.
                </p>
                <div className="intro-meta">
                  <span>~5 min</span>
                  <span>Anonymous</span>
                  <span>{questions.length} moments</span>
                </div>
                <button className="primary start" onClick={() => setStep(0)}>
                  Start <span>↗</span>
                </button>
                <p className="privacy-note">
                  Anonymous. No name or email collected.{" "}
                  <Link href="/privacy">Privacy</Link>
                </p>
              </>
            ) : (
              <>
                <div className="question-meta">
                  <span className="eyebrow">{q.section}</span>
                  <span>
                    {String(step + 1).padStart(2, "0")} / {questions.length}
                  </span>
                </div>
                <h1 ref={heading} tabIndex={-1} className="question-title">
                  {q.title}
                </h1>
                {"subtitle" in q && (
                  <p className="question-subtitle">{q.subtitle}</p>
                )}
                {q.type === "choice" && (
                  <div className="choices">
                    {q.options.map((o, i) => (
                      <button
                        key={o}
                        className={value === o ? "selected" : ""}
                        aria-pressed={value === o}
                        onClick={() => set(q.id, o)}
                      >
                        <span className="choice-num">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {o}
                        <span className="check">{value === o ? "✓" : "+"}</span>
                      </button>
                    ))}
                  </div>
                )}
                {q.type === "country" && (
                  <div className="country-picker">
                    <label className="field-label" htmlFor="country-search">
                      Search for your country
                    </label>
                    <input
                      id="country-search"
                      type="search"
                      placeholder="Type a country name…"
                      autoComplete="off"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                    />
                    <p className="country-current" aria-live="polite">
                      {draft.country_code
                        ? `Selected: ${countries.find((c) => c.code === draft.country_code)?.name}`
                        : "Choose one country below"}
                    </p>
                    <div
                      className="country-options"
                      role="group"
                      aria-label="Countries"
                    >
                      {countries
                        .filter(
                          (c) =>
                            c.name
                              .toLowerCase()
                              .includes(countrySearch.trim().toLowerCase()) ||
                            c.code.toLowerCase() ===
                              countrySearch.trim().toLowerCase(),
                        )
                        .map((c) => (
                          <button
                            type="button"
                            key={c.code}
                            aria-pressed={draft.country_code === c.code}
                            className={`country-option ${draft.country_code === c.code ? "selected" : ""}`}
                            onClick={() => {
                              set("country_code", c.code);
                              setCountrySearch(c.name);
                            }}
                          >
                            {c.name}
                            <span>
                              {draft.country_code === c.code ? "✓" : c.code}
                            </span>
                          </button>
                        ))}
                      {!countries.some(
                        (c) =>
                          c.name
                            .toLowerCase()
                            .includes(countrySearch.trim().toLowerCase()) ||
                          c.code.toLowerCase() ===
                            countrySearch.trim().toLowerCase(),
                      ) && (
                        <p className="hint">
                          No countries found. Try another spelling.
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {q.type === "pairedScale" && (
                  <div className="paired-scales">
                    {q.prompts.map((p) => (
                      <div className="paired-item" key={p.key}>
                        <h2>{p.title}</h2>
                        <NumericScale
                          label={p.title}
                          value={draft[p.key]}
                          onChange={(v) => set(p.key, v)}
                          left={p.left}
                          middle={
                            p.key === "perception_change"
                              ? "About the same"
                              : undefined
                          }
                          right={p.right}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {q.type === "scale" && (
                  <>
                    <NumericScale
                      label={q.title}
                      value={value as number | undefined}
                      onChange={(v) => set(q.id, v)}
                      left={q.left}
                      right={q.right}
                    />
                  </>
                )}
                {q.type === "interests" && (
                  <div className="scale-list">
                    {interests.map(([k, label]) => (
                      <div key={k}>
                        <h2>{label}</h2>
                        <NumericScale
                          label={label}
                          value={draft[k]}
                          onChange={(v) => set(k, v)}
                          left="Not really"
                          right="A lot"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {q.type === "attributes" && (
                  <div className="attribute-list">
                    <p className="hint">
                      Rate performance and innovation, then place Nike between
                      each pair of ideas. Use 0–10 for every answer.
                    </p>
                    {attributes.map(({ key, label, left, middle, right }) => (
                      <div className="attribute-slider" key={key}>
                        <h2>{label}</h2>
                        <NumericScale
                          label={label}
                          value={draft[key]}
                          onChange={(v) => set(key, v)}
                          left={left}
                          middle={middle}
                          right={right}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {q.type === "chips" && (
                  <>
                    <p className="hint">
                      Select all that apply.
                      {(value as string[] | undefined)?.length || 0} selected.
                    </p>
                    <div className="chips">
                      {q.options.map((o) => {
                        const picked = ((value as string[]) || []).includes(o);
                        return (
                          <button
                            key={o}
                            aria-pressed={picked}
                            className={picked ? "selected" : ""}
                            onClick={() =>
                              set(
                                q.id,
                                picked
                                  ? (value as string[]).filter((x) => x !== o)
                                  : [...((value as string[]) || []), o],
                              )
                            }
                          >
                            {o}
                            <span>{picked ? "✓" : "+"}</span>
                          </button>
                        );
                      })}
                    </div>
                    {q.id === "nike_weaknesses" &&
                    (value as string[] | undefined)?.length ? (
                      <div
                        className="priority-choice"
                        role="group"
                        aria-label="Most important weakness"
                      >
                        <h2>Which of these matters most to you?</h2>
                        <div className="chips">
                          {(value as string[]).map((option) => (
                            <button
                              type="button"
                              key={option}
                              className={
                                draft.priority_weakness === option
                                  ? "selected"
                                  : ""
                              }
                              aria-pressed={draft.priority_weakness === option}
                              onClick={() => set("priority_weakness", option)}
                            >
                              {option}
                              <span>
                                {draft.priority_weakness === option ? "✓" : "+"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
                {q.type === "tiers" && (
                  <TierList
                    value={draft.brand_tiers}
                    onChange={(v) => set("brand_tiers", v)}
                  />
                )}
                {q.type === "recentPurchase" && (
                  <div className="recent-purchase">
                    <div role="group" aria-label="Brand bought most recently">
                      <h2>Which brand did you choose?</h2>
                      <div className="chips">
                        {recentPurchaseBrands.map((option) => (
                          <button
                            type="button"
                            key={option}
                            className={
                              draft.recent_purchase_brand === option
                                ? "selected"
                                : ""
                            }
                            aria-pressed={
                              draft.recent_purchase_brand === option
                            }
                            onClick={() => {
                              setDraft((d) => ({
                                ...d,
                                recent_purchase_brand: option,
                                recent_purchase_reason:
                                  option === "No recent purchase"
                                    ? ""
                                    : d.recent_purchase_reason || "",
                              }));
                              setError("");
                            }}
                          >
                            {option}
                            <span>
                              {draft.recent_purchase_brand === option
                                ? "✓"
                                : "+"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {draft.recent_purchase_brand &&
                      draft.recent_purchase_brand !== "No recent purchase" && (
                        <div role="group" aria-label="Main purchase reason">
                          <h2>What mattered most?</h2>
                          <div className="chips">
                            {purchaseReasons.map((option) => (
                              <button
                                type="button"
                                key={option}
                                className={
                                  draft.recent_purchase_reason === option
                                    ? "selected"
                                    : ""
                                }
                                aria-pressed={
                                  draft.recent_purchase_reason === option
                                }
                                onClick={() =>
                                  set("recent_purchase_reason", option)
                                }
                              >
                                {option}
                                <span>
                                  {draft.recent_purchase_reason === option
                                    ? "✓"
                                    : "+"}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
                {q.type === "feelingChoices" && (
                  <div className="feeling-pair">
                    {(
                      [
                        ["nike_used_to_feel", "Nike used to feel…"],
                        ["nike_today_feels", "Today it feels…"],
                      ] as const
                    ).map(([key, label]) => (
                      <div
                        className="feeling-group"
                        role="group"
                        aria-label={label}
                        key={key}
                      >
                        <h2>{label}</h2>
                        <div className="feeling-options">
                          {feelingOptions.map((option) => (
                            <button
                              type="button"
                              key={option}
                              aria-pressed={draft[key] === option}
                              className={
                                draft[key] === option ? "selected" : ""
                              }
                              onClick={() => set(key, option)}
                            >
                              {option}
                              <span>{draft[key] === option ? "✓" : "+"}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {q.type === "textarea" && (
                  <label className="field-label">
                    Your one change (optional)
                    <textarea
                      maxLength={180}
                      rows={4}
                      value={draft.ceo_change || ""}
                      onChange={(e) => set("ceo_change", e.target.value)}
                    />
                    <span className="counter">
                      {draft.ceo_change?.length || 0}/180
                    </span>
                  </label>
                )}
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <div className="survey-nav">
                  <button className="back" onClick={back} disabled={busy}>
                    ← Back
                  </button>
                  <button className="primary" onClick={next} disabled={busy}>
                    {busy
                      ? "Saving…"
                      : step === questions.length - 1
                        ? "Finish"
                        : "Continue"}{" "}
                    <span>→</span>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="survey-footer">
        <span>
          Independent personal research project. Not an official Nike survey.
        </span>
        <Link href="/privacy">Privacy</Link>
      </footer>
    </div>
  );
}
