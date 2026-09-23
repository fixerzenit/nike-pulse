"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Response } from "@/lib/validation";
import {
  median,
  percentage,
  groupBy,
  tierAverage,
  weightedMean,
  weightedCount,
  weightedShare,
  weightedDistribution,
  type WeightMode,
  filteredDataset,
  words,
  csv,
  type Filters,
} from "@/lib/analytics";
import {
  brands,
  legacyBrands,
  previousBrands,
  tiers,
  tierLabels,
  categories,
  reasons,
  attributes,
  legacyAttributes,
  feelingOptions,
  recentPurchaseBrands,
  purchaseReasons,
  VERSION,
  interests,
  type LegacyBrand,
  type Tier,
} from "@/lib/survey-config";
const Matrix = dynamic(() => import("./Charts").then((m) => m.Matrix), {
  ssr: false,
  loading: () => <div className="skeleton" />,
});
const Distribution = dynamic(
  () => import("./Charts").then((m) => m.Distribution),
  { ssr: false },
);
const PurchaseScatter = dynamic(
  () => import("./Charts").then((m) => m.PurchaseScatter),
  { ssr: false },
);
const format = (v: number | null, d = 1) => (v === null ? "—" : v.toFixed(d));
const signed = (v: number | null) =>
  v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
const dimensions = [
  ["age_group", "Age"],
  ["country_name", "Country"],
  ["work_field", "Field of work"],
  ["interest_sneakers", "Sneaker interest"],
  ["last_nike_purchase", "Last Nike purchase"],
] as const;
const filterFields = [
  ["survey_version", "Survey version"],
  ["age_group", "Age"],
  ["country_name", "Country"],
  ["work_field", "Field of work"],
  ...interests,
  ["last_nike_purchase", "Last Nike purchase"],
] as const;
function Section({
  id,
  no,
  title,
  subtitle,
  children,
}: {
  id: string;
  no: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="analysis-section">
      <div className="section-heading">
        <span className="section-no">{no}</span>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
function download(rows: Response[], name: string, brandOnly = false) {
  const url = URL.createObjectURL(
    new Blob([csv(rows, brandOnly)], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Dashboard({
  initialRows,
  demo,
  raw = false,
  resultsPath,
  publicAccess = false,
}: {
  initialRows: Response[];
  demo: boolean;
  raw?: boolean;
  resultsPath: string;
  publicAccess?: boolean;
}) {
  const defaultVersion =
    ([VERSION, "1.3", "1.2", "1.1", "1.0"] as const).find((v) =>
      initialRows.some((r) => r.survey_version === v),
    ) || VERSION;
  const [filters, setFilters] = useState<Filters>({
    survey_version: [defaultVersion],
  });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dimension, setDimension] = useState<keyof Response>("age_group");
  const [search, setSearch] = useState("");
  const [weightMode, setWeightMode] = useState<WeightMode>("base");
  const [visibleTextCount, setVisibleTextCount] = useState(12);
  const [tierDetail, setTierDetail] = useState<{
    brand: LegacyBrand;
    tier: (typeof tiers)[number];
  } | null>(null);
  const [purchaseMeasure, setPurchaseMeasure] = useState<
    "purchase_consideration" | "apparel_purchase_consideration"
  >("purchase_consideration");
  const [metric, setMetric] = useState<
    "overall_perception" | "culture_score" | "product_innovation_score"
  >("overall_perception");
  const rows = useMemo(
    () => filteredDataset(initialRows, filters, from, to),
    [initialRows, filters, from, to],
  );
  const selectedVersion = filters.survey_version?.[0] || defaultVersion;
  const modernScale = !["1.0", "1.1"].includes(selectedVersion);
  const scoreMin = modernScale ? 0 : 1;
  const scoreMax = modernScale ? 10 : 7;
  const scoreMid = modernScale ? 5 : 4;
  const share = (v: Response[], predicate: (r: Response) => boolean) =>
    weightedShare(v, weightMode, predicate);
  const avg = (
    v: Response[],
    value: (r: Response) => number | undefined | null,
  ) => weightedMean(v, weightMode, value);
  const visibleBrands: readonly LegacyBrand[] =
    selectedVersion === "1.0"
      ? legacyBrands.slice(0, 8)
      : selectedVersion === "1.1"
        ? legacyBrands
        : selectedVersion === "1.2"
          ? previousBrands
          : brands;
  const brandTier = (r: Response, brand: LegacyBrand) =>
    (r.brand_tiers as Record<string, Tier | undefined>)[brand];
  const tierCount = tierDetail
    ? rows.filter((r) => brandTier(r, tierDetail.brand) === tierDetail.tier)
        .length
    : 0;
  const tierDenominator = tierDetail
    ? rows.filter((r) => brandTier(r, tierDetail.brand) !== undefined).length
    : 0;
  const tierDescription = tierDetail
    ? `${tierDetail.brand} · ${tierLabels[tiers.indexOf(tierDetail.tier)]}: ${share(
        rows.filter((r) => brandTier(r, tierDetail.brand) !== undefined),
        (r) => brandTier(r, tierDetail.brand) === tierDetail.tier,
      ).toFixed(1)}% (${tierCount} of ${tierDenominator} people ranked)`
    : "";
  const average = (key: keyof Response) =>
    avg(rows, (r) => (typeof r[key] === "number" ? Number(r[key]) : undefined));
  const gap = average("culture_product_gap");
  const recentAnswered = rows.filter((r) => !!r.recent_purchase_brand);
  const reasonAnswered = rows.filter((r) => !!r.recent_purchase_reason);
  const priorityAnswered = rows.filter((r) => !!r.priority_weakness);
  const recentBrandRows = recentPurchaseBrands
    .map((label) => ({
      label,
      pct: share(recentAnswered, (r) => r.recent_purchase_brand === label),
    }))
    .sort((a, b) => b.pct - a.pct);
  const purchaseReasonRows = purchaseReasons
    .map((label) => ({
      label,
      pct: share(reasonAnswered, (r) => r.recent_purchase_reason === label),
    }))
    .sort((a, b) => b.pct - a.pct);
  const priorityRows = categories
    .map((label) => ({
      label,
      pct: share(priorityAnswered, (r) => r.priority_weakness === label),
    }))
    .sort((a, b) => b.pct - a.pct);
  const segments = Object.entries(groupBy(rows, (r) => String(r[dimension])))
    .map(([label, v]) => ({
      label,
      n: v.length,
      culture: avg(v, (r) => r.culture_score),
      product: avg(v, (r) => r.product_innovation_score),
      gap: avg(v, (r) => r.culture_product_gap),
    }))
    .sort((a, b) => (b.gap || 0) - (a.gap || 0));
  const textRows = rows.filter((r) =>
    [
      r.nike_used_to_feel,
      r.nike_today_feels,
      r.ceo_change,
      r.country_name,
      r.work_field,
      r.id,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const filtersActive =
    Object.entries(filters).some(([k, v]) =>
      k === "survey_version"
        ? v.length !== 1 || v[0] !== defaultVersion
        : v.length > 0,
    ) || Boolean(from || to);
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <Link className="wordmark" href={resultsPath}>
          BRAND
          <br />
          PULSE<span> / 01</span>
        </Link>
        <p className="sidebar-caption">NIKE PERCEPTION STUDY</p>
        <nav>
          <Link className={!raw ? "active" : ""} href={resultsPath}>
            Overview <span>↗</span>
          </Link>
          <Link
            className={raw ? "active" : ""}
            href={`${resultsPath}/responses`}
          >
            Responses <span>{initialRows.length}</span>
          </Link>
          {!raw && (
            <>
              <a href="#matrix">Culture × product</a>
              <a href="#arena">Brand arena</a>
              <a href="#voice">In their words</a>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <span className="eyebrow">
            {publicAccess ? "PUBLIC DASHBOARD" : "PRIVATE RESULTS LINK"}
          </span>
          <Link href="/">View survey ↗</Link>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-header">
          <span className="eyebrow">RESEARCH / NIKE / VERSION {VERSION}</span>
          <span className="status">
            {demo
              ? "Demo data · Synthetic"
              : publicAccess
                ? "Public · Live responses"
                : "Private · Live responses"}
          </span>
        </header>
        <div className="dashboard-title">
          <div>
            <p className="eyebrow">THE BRAND, THROUGH THEIR EYES</p>
            <h1>{raw ? "Every perspective." : "Nike, today."}</h1>
            <p>A closer look at what the brand means — and what comes next.</p>
          </div>
          <div className="export-menu">
            <details>
              <summary>Export data ↓</summary>
              <div>
                <button onClick={() => download(rows, "nike-filtered.csv")}>
                  Filtered responses ({rows.length})
                </button>
                <button onClick={() => download(initialRows, "nike-full.csv")}>
                  Full dataset ({initialRows.length})
                </button>
                <button
                  onClick={() => download(rows, "nike-brand-tiers.csv", true)}
                >
                  Filtered brand tiers
                </button>
              </div>
            </details>
          </div>
        </div>
        <div className="filter-bar">
          <div className="filter-top">
            <strong>Explore your sample</strong>
            <span aria-live="polite">
              {rows.length} of {initialRows.length} responses
            </span>
            <button
              onClick={() => {
                setFilters({ survey_version: [defaultVersion] });
                setFrom("");
                setTo("");
              }}
              disabled={!filtersActive}
            >
              Reset filters
            </button>
          </div>
          <div className="filters">
            {filterFields.map(([key, label]) => (
              <details
                key={key}
                className={filters[key]?.length ? "has-filter" : ""}
              >
                <summary>
                  {label}
                  {filters[key]?.length ? ` (${filters[key].length})` : ""}{" "}
                  <span>⌄</span>
                </summary>
                <div className="filter-options">
                  {[...new Set(initialRows.map((r) => String(r[key])))]
                    .sort()
                    .map((value) => (
                      <label key={value}>
                        <input
                          type={key === "survey_version" ? "radio" : "checkbox"}
                          name={
                            key === "survey_version"
                              ? "survey_version"
                              : undefined
                          }
                          checked={filters[key]?.includes(value) || false}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              [key]:
                                key === "survey_version"
                                  ? [value]
                                  : e.target.checked
                                    ? [...(f[key] || []), value]
                                    : (f[key] || []).filter((v) => v !== value),
                            }))
                          }
                        />
                        {value}
                      </label>
                    ))}
                </div>
              </details>
            ))}
            <label className="date-filter">
              From
              <input
                aria-label="From date"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="date-filter">
              To
              <input
                aria-label="To date"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
          {filtersActive && (
            <p className="hint">
              Active:{" "}
              {Object.entries(filters)
                .flatMap(([k, v]) =>
                  v.map(
                    (x) =>
                      `${filterFields.find((f) => f[0] === k)?.[1] || k}: ${x}`,
                  ),
                )
                .join(" · ")}{" "}
              {from && `from ${from}`} {to && `to ${to}`}
            </p>
          )}
        </div>
        <div
          className="weight-controls"
          role="group"
          aria-label="Results weighting"
        >
          <div>
            <strong>How each response counts</strong>
            <p>
              Base: every person counts 1. Weighted: Creative / Design and
              Fashion count 1.2; everyone else counts 1. This prioritizes those
              perspectives, but does not make the sample representative.
            </p>
          </div>
          <div className="weight-options">
            <button
              type="button"
              aria-pressed={weightMode === "base"}
              className={weightMode === "base" ? "selected" : ""}
              onClick={() => setWeightMode("base")}
            >
              Base
            </button>
            <button
              type="button"
              aria-pressed={weightMode === "weighted"}
              className={weightMode === "weighted" ? "selected" : ""}
              onClick={() => setWeightMode("weighted")}
            >
              Weighted
            </button>
          </div>
        </div>
        <p className="sample-note">
          {publicAccess
            ? "This dashboard is public. Anyone can open /dashboard and view or export individual responses."
            : "Anyone with this results link can view and export responses. Keep it private."}{" "}
          <br />
          This is a directional convenience sample, not a representative
          population survey.
          {demo
            ? " All records in this development view are synthetic."
            : initialRows.some((r) => r.is_synthetic)
              ? ` Includes ${initialRows.filter((r) => r.is_synthetic).length} synthetic records. Remove these before collecting real responses.`
              : ""}
        </p>
        {!rows.length ? (
          <div className="empty">
            <h2>No responses in this view.</h2>
            <p>Try removing a filter or widening the date range.</p>
            <button
              onClick={() => {
                setFilters({ survey_version: [defaultVersion] });
                setFrom("");
                setTo("");
              }}
            >
              Reset filters
            </button>
          </div>
        ) : (
          <>
            {!raw && (
              <>
                <div className="metrics">
                  {[
                    [
                      "Completed responses",
                      String(rows.length),
                      "current sample",
                    ],
                    [
                      "Overall perception",
                      format(average("overall_perception")),
                      `out of ${scoreMax}`,
                    ],
                    [
                      "Cultural relevance",
                      format(average("culture_score")),
                      `out of ${scoreMax}`,
                    ],
                    [
                      "Product innovation",
                      format(average("product_innovation_score")),
                      `out of ${scoreMax}`,
                    ],
                    [
                      "Culture / product gap",
                      signed(gap),
                      "points · culture minus product",
                    ],
                    [
                      "Sneaker consideration",
                      format(average("purchase_consideration")),
                      "out of 10",
                    ],
                    [
                      "Apparel consideration",
                      format(average("apparel_purchase_consideration")),
                      "out of 10",
                    ],
                  ].map(([label, val, sub]) => (
                    <div className="metric" key={label}>
                      <span>{label}</span>
                      <strong>{val}</strong>
                      <small>{sub}</small>
                    </div>
                  ))}
                </div>
                <p className="hint">
                  {weightMode === "weighted"
                    ? "Weighted averages and shares are shown below; n always means actual people. Individual response dots and quotes remain unweighted."
                    : "Averages and shares use one vote per person; n means actual people."}
                </p>
                <div className="change-summary">
                  {[
                    [
                      "Worsened",
                      share(rows, (r) => r.perception_change < scoreMid),
                    ],
                    [
                      "About the same",
                      share(rows, (r) => r.perception_change === scoreMid),
                    ],
                    [
                      "Improved",
                      share(rows, (r) => r.perception_change > scoreMid),
                    ],
                  ].map(([label, count]) => (
                    <div key={label}>
                      <strong>{format(Number(count), 0)}%</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                  <p>
                    Perception compared with
                    <br />
                    3–5 years ago
                  </p>
                </div>
                <Section
                  id="matrix"
                  no="01"
                  title="Culture meets product."
                  subtitle="Each blue dot represents one or more people at the same scores. The red diamond is the average; dashed lines mark its coordinates. The right panel explains the gap."
                >
                  <div className="matrix-layout">
                    <Matrix
                      rows={rows}
                      min={scoreMin}
                      max={scoreMax}
                      midpoint={scoreMid}
                      weightMode={weightMode}
                    />
                    <aside className="matrix-reading">
                      <span className="eyebrow">THE CURRENT SAMPLE</span>
                      <strong>{signed(gap)}</strong>
                      <h3>Culture / product gap</h3>
                      <p>
                        Among these {rows.length} respondents, cultural
                        relevance averages {format(average("culture_score"))}{" "}
                        and product innovation averages{" "}
                        {format(average("product_innovation_score"))}.
                      </p>
                      <div>
                        <span>Culture</span>
                        <b>
                          {format(average("culture_score"))} / {scoreMax}
                        </b>
                      </div>
                      <div>
                        <span>Product</span>
                        <b>
                          {format(average("product_innovation_score"))} /{" "}
                          {scoreMax}
                        </b>
                      </div>
                      <small>
                        A positive gap means culture scores higher. This is
                        descriptive, not a causal finding.
                      </small>
                    </aside>
                  </div>
                </Section>
                <Section
                  id="segments"
                  no="02"
                  title="Different people. Different gaps."
                >
                  <label className="inline-control">
                    Group by{" "}
                    <select
                      value={dimension}
                      onChange={(e) =>
                        setDimension(e.target.value as keyof Response)
                      }
                    >
                      {dimensions.map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Segment</th>
                          <th>n</th>
                          <th>Culture / {scoreMax}</th>
                          <th>Product / {scoreMax}</th>
                          <th>Gap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {segments.map((s) => (
                          <tr key={s.label}>
                            <th>{s.label}</th>
                            <td>
                              {s.n}
                              {s.n < 5 ? " *" : ""}
                            </td>
                            <td>{format(s.culture)}</td>
                            <td>{format(s.product)}</td>
                            <td>
                              <span className="gap-value">{signed(s.gap)}</span>
                              <span
                                className="mini-gap"
                                style={{
                                  width: `${Math.abs(s.gap || 0) * 12}px`,
                                  background:
                                    (s.gap || 0) >= 0 ? "#1b24f1" : "#ff2200",
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="hint">
                    * Fewer than 5 responses; interpret with particular care.
                  </p>
                </Section>
                <Section
                  id="arena"
                  no="03"
                  title="The consideration set."
                  subtitle="Each bar shows how people ranked a brand for their next sneaker purchase. Larger S and A segments mean stronger consideration; the number at right is its average tier score out of 4."
                >
                  <div className="tier-legend">
                    {tiers.map((t, i) => (
                      <span key={t}>
                        <i className={`swatch swatch-${i}`} />
                        {t} · {tierLabels[i]}
                      </span>
                    ))}
                  </div>
                  <p className="hint" aria-live="polite">
                    {tierDescription ||
                      "Select a tier segment for its exact percentage and response count."}
                  </p>
                  <div className="brand-analysis">
                    {[...visibleBrands]
                      .sort(
                        (a, b) =>
                          (tierAverage(rows, b, weightMode) || 0) -
                          (tierAverage(rows, a, weightMode) || 0),
                      )
                      .map((brand, index) => (
                        <div className="brand-result" key={brand}>
                          <span className="rank">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <strong>{brand}</strong>
                          <div className="stacked">
                            {tiers.map((t, i) => {
                              const pct = share(
                                rows.filter(
                                  (r) => brandTier(r, brand) !== undefined,
                                ),
                                (r) => brandTier(r, brand) === t,
                              );
                              return (
                                <button
                                  key={t}
                                  className={`swatch-${i}`}
                                  style={{ width: `${pct}%` }}
                                  onClick={() =>
                                    setTierDetail({ brand, tier: t })
                                  }
                                  aria-label={`${brand} ${t}: ${pct.toFixed(1)}%`}
                                  title={`${tierLabels[i]}: ${pct.toFixed(1)}%`}
                                >
                                  {pct >= 12 ? `${pct.toFixed(0)}%` : ""}
                                </button>
                              );
                            })}
                          </div>
                          <b>
                            {format(tierAverage(rows, brand, weightMode), 2)}
                            <small>
                              {" "}
                              / 4 · n=
                              {
                                rows.filter(
                                  (r) => brandTier(r, brand) !== undefined,
                                ).length
                              }
                            </small>
                          </b>
                        </div>
                      ))}
                  </div>
                </Section>
                <Section
                  id="strengths"
                  no="04"
                  title="Where it wins. Where it slips."
                  subtitle="Red, left: share who selected a weakness. Blue, right: share who selected a strength. People could choose any number, so percentages need not add to 100."
                >
                  <div className="strength-labels">
                    <span>← Falling behind</span>
                    <span>Strongest →</span>
                  </div>
                  {categories.map((c) => {
                    const strength = share(rows, (r) =>
                      r.nike_strengths.includes(c),
                    );
                    const weak = share(rows, (r) =>
                      r.nike_weaknesses.includes(c),
                    );
                    return (
                      <div className="diverging-row" key={c}>
                        <span>{c}</span>
                        <div className="diverging-track">
                          <div className="weak-half">
                            <b style={{ width: `${weak}%` }} />
                          </div>
                          <div className="strong-half">
                            <b style={{ width: `${strength}%` }} />
                          </div>
                        </div>
                        <small>
                          {weak.toFixed(0)}% / {strength.toFixed(0)}%
                        </small>
                      </div>
                    );
                  })}
                </Section>
                {rows.some((r) => r.survey_version === "1.4") && (
                  <Section
                    id="decisions"
                    no="05"
                    title="Choices and priorities."
                    subtitle="The brand most recently bought, the main purchase reason, and the one Nike weakness each person considers most important. Percentages use people who answered each item."
                  >
                    <div className="two-col decision-columns">
                      <div>
                        <h3>
                          Most recent purchase{" "}
                          <small>n={recentAnswered.length}</small>
                        </h3>
                        {recentBrandRows.map(({ label, pct }) => (
                          <div
                            className="reason-row decision-row"
                            style={{
                              background: `linear-gradient(90deg, #eef0ff ${pct}%, transparent ${pct}%)`,
                            }}
                            key={label}
                          >
                            <span>{label}</span>
                            <b>{pct.toFixed(0)}%</b>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h3>
                          Why they chose it{" "}
                          <small>n={reasonAnswered.length}</small>
                        </h3>
                        {purchaseReasonRows.map(({ label, pct }) => (
                          <div
                            className="reason-row decision-row"
                            style={{
                              background: `linear-gradient(90deg, #eef0ff ${pct}%, transparent ${pct}%)`,
                            }}
                            key={label}
                          >
                            <span>{label}</span>
                            <b>{pct.toFixed(0)}%</b>
                          </div>
                        ))}
                      </div>
                    </div>
                    <h3>
                      Most important Nike weakness{" "}
                      <small>n={priorityAnswered.length}</small>
                    </h3>
                    <div className="two-col decision-columns">
                      {priorityRows.map(({ label, pct }) => (
                        <div
                          className="reason-row decision-row"
                          style={{
                            background: `linear-gradient(90deg, #eef0ff ${pct}%, transparent ${pct}%)`,
                          }}
                          key={label}
                        >
                          <span>{label}</span>
                          <b>{pct.toFixed(0)}%</b>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
                <Section
                  id="change"
                  no={selectedVersion === "1.4" ? "06" : "05"}
                  title="A change in feeling."
                  subtitle="0 means much worse than 3–5 years ago, 5 means unchanged, and 10 means much better. Taller bars mean more responses at that score."
                >
                  <div className="two-col">
                    <div>
                      <Distribution
                        data={weightedDistribution(
                          rows,
                          weightMode,
                          (r) => r.perception_change,
                          scoreMin,
                          scoreMax,
                        )}
                        midpoint={scoreMid}
                        weighted={weightMode === "weighted"}
                      />
                      <div className="anchors">
                        <span>{scoreMin} · Much worse</span>
                        <span>{scoreMid} · Same</span>
                        <span>{scoreMax} · Much better</span>
                      </div>
                    </div>
                    <div>
                      <h3>What changed it most?</h3>
                      <p className="hint">
                        Among{" "}
                        {
                          rows.filter((r) => r.perception_change !== scoreMid)
                            .length
                        }{" "}
                        respondents reporting a change.
                      </p>
                      {reasons
                        .map((reason) => ({
                          reason,
                          n: weightedCount(
                            rows,
                            weightMode,
                            (r) =>
                              r.perception_change !== scoreMid &&
                              r.perception_change_reasons.includes(reason),
                          ),
                        }))
                        .sort((a, b) => b.n - a.n)
                        .map(({ reason, n }) => (
                          <div className="reason-row" key={reason}>
                            <span>{reason}</span>
                            <b>
                              {format(
                                percentage(
                                  n,
                                  weightedCount(
                                    rows,
                                    weightMode,
                                    (r) => r.perception_change !== scoreMid,
                                  ),
                                ),
                                0,
                              )}
                              %
                            </b>
                          </div>
                        ))}
                    </div>
                  </div>
                </Section>
                <Section
                  id="attributes"
                  no={selectedVersion === "1.4" ? "07" : "06"}
                  title={
                    selectedVersion === VERSION || selectedVersion === "1.3"
                      ? "Four signals."
                      : "Seven signals."
                  }
                  subtitle={
                    selectedVersion === VERSION || selectedVersion === "1.3"
                      ? "Performance and innovation are ratings. Audience and focus show where Nike sits between two poles."
                      : `How strongly each attribute describes Nike today, from ${scoreMin} (not at all) to ${scoreMax} (very much).`
                  }
                >
                  {(selectedVersion === VERSION || selectedVersion === "1.3"
                    ? attributes.map(({ key, label, left, right }) => ({
                        key,
                        label,
                        left,
                        right,
                      }))
                    : legacyAttributes.map(([key, label]) => ({
                        key,
                        label,
                        left: undefined,
                        right: undefined,
                      }))
                  ).map(({ key, label, left, right }) => {
                    const scores = rows.flatMap((r) =>
                      typeof r[key] === "number" ? [r[key]] : [],
                    );
                    const avgScore = weightedMean(rows, weightMode, (r) =>
                      typeof r[key] === "number" ? Number(r[key]) : undefined,
                    );
                    const avg = avgScore;
                    const eligible = rows.filter(
                      (r) => typeof r[key] === "number",
                    );
                    return (
                      <div className="tension-result" key={key}>
                        <span>{label}</span>
                        <div className="tension-chart">
                          <div className="tension-track">
                            {weightedDistribution(
                              eligible,
                              weightMode,
                              (r) => Number(r[key]),
                              scoreMin,
                              scoreMax,
                            ).map((d) => (
                              <div
                                key={d.value}
                                title={`${d.value}: ${d.count} responses`}
                                style={{
                                  opacity: eligible.length
                                    ? 0.15 +
                                      ((0.85 * d.count) /
                                        weightedCount(eligible, weightMode)) *
                                        4
                                    : 0.15,
                                }}
                              />
                            ))}
                            {avg !== null && (
                              <b
                                style={{
                                  left: `${((avg - scoreMin) / (scoreMax - scoreMin)) * 100}%`,
                                }}
                              >
                                {format(avg)}
                              </b>
                            )}
                          </div>
                          {left && right && (
                            <div className="tension-axis">
                              <span>0 · {left}</span>
                              <span>10 · {right}</span>
                            </div>
                          )}
                        </div>
                        <span>
                          {avg === null
                            ? "No responses"
                            : `Mean ${format(avg)}`}
                          <small>
                            Raw median {format(median(scores))} · n=
                            {scores.length}
                          </small>
                        </span>
                      </div>
                    );
                  })}
                </Section>
                <Section
                  id="purchase"
                  no={selectedVersion === "1.4" ? "08" : "07"}
                  title="Admiration. Meet intention."
                  subtitle="Each dot is one person's perception score (horizontal) and likelihood to consider Nike (vertical). Compare sneakers with apparel using the selector."
                >
                  <label className="inline-control">
                    Purchase consideration vs{" "}
                    <select
                      value={metric}
                      onChange={(e) =>
                        setMetric(e.target.value as typeof metric)
                      }
                    >
                      <option value="overall_perception">
                        Overall perception
                      </option>
                      <option value="culture_score">Cultural relevance</option>
                      <option value="product_innovation_score">
                        Product innovation
                      </option>
                    </select>
                  </label>
                  <label className="inline-control">
                    Purchase type{" "}
                    <select
                      value={purchaseMeasure}
                      onChange={(e) =>
                        setPurchaseMeasure(
                          e.target.value as typeof purchaseMeasure,
                        )
                      }
                    >
                      <option value="purchase_consideration">Sneakers</option>
                      <option value="apparel_purchase_consideration">
                        Apparel
                      </option>
                    </select>
                  </label>
                  <div className="two-col">
                    <div>
                      {rows.some(
                        (r) => typeof r[purchaseMeasure] === "number",
                      ) ? (
                        <PurchaseScatter
                          rows={rows.filter(
                            (r) => typeof r[purchaseMeasure] === "number",
                          )}
                          metric={metric}
                          measure={purchaseMeasure}
                          scoreMin={scoreMin}
                          scoreMax={scoreMax}
                        />
                      ) : (
                        <p className="empty">
                          No answers for this purchase type in the selected
                          survey version.
                        </p>
                      )}
                      <p className="hint">
                        Vertical:{" "}
                        {purchaseMeasure === "purchase_consideration"
                          ? "sneaker"
                          : "apparel"}{" "}
                        purchase consideration (0–10). Each point is a response.
                      </p>
                    </div>
                    <div>
                      <h3>Last purchase × culture / product gap</h3>
                      {Object.entries(
                        groupBy(rows, (r) => r.last_nike_purchase),
                      ).map(([label, v]) => (
                        <div className="reason-row" key={label}>
                          <span>
                            {label}
                            <small>n = {v.length}</small>
                          </span>
                          <b>{signed(avg(v, (r) => r.culture_product_gap))}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                </Section>
              </>
            )}
            <Section
              id="voice"
              no={raw ? "" : selectedVersion === "1.4" ? "09" : "08"}
              title={raw ? "The response explorer." : "In their own words."}
              subtitle="Selected feelings are counted by answer; written suggestions use simple word counts. These are descriptive, not representative findings."
            >
              <label className="search-text">
                Search responses
                <input
                  type="search"
                  placeholder="Search words, country, work or response ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <p className="hint">
                {textRows.length} matching responses. Text search applies to
                this section; exports use the global filters.
              </p>
              {!raw && (
                <div className="two-col word-columns">
                  {[
                    ["nike_used_to_feel", "Nike used to feel…"],
                    ["nike_today_feels", "Today it feels…"],
                    ["ceo_change", "CEO for one day"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <h3>{label}</h3>
                      <div className="word-chips">
                        {(key === "ceo_change"
                          ? words(textRows, "ceo_change", weightMode)
                          : feelingOptions
                              .map(
                                (option) =>
                                  [
                                    option,
                                    weightedCount(
                                      textRows,
                                      weightMode,
                                      (r) =>
                                        r[
                                          key as
                                            | "nike_used_to_feel"
                                            | "nike_today_feels"
                                        ] === option,
                                    ),
                                  ] as const,
                              )
                              .filter(([, count]) => count > 0)
                              .sort((a, b) => b[1] - a[1])
                        ).map(([word, n]) => (
                          <span key={word}>
                            {word}{" "}
                            <b>
                              {Number(n).toFixed(
                                weightMode === "weighted" ? 1 : 0,
                              )}
                            </b>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!textRows.length && (
                <p className="empty">No written responses match your search.</p>
              )}
              <div className="text-list">
                {textRows.slice(0, visibleTextCount).map((r) => (
                  <article key={r.id}>
                    <div className="response-meta">
                      {r.age_group} · {r.country_name} · {r.work_field}{" "}
                      <span>
                        {new Date(r.completed_at).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                    <div className="before-after-quote">
                      <p>
                        <small>USED TO</small>
                        {r.nike_used_to_feel}
                      </p>
                      <span>→</span>
                      <p>
                        <small>TODAY</small>
                        {r.nike_today_feels}
                      </p>
                    </div>
                    {r.ceo_change?.trim() && (
                      <p className="ceo-quote">“{r.ceo_change}”</p>
                    )}
                    {raw && (
                      <details>
                        <summary>View complete response</summary>
                        <dl className="raw-record">
                          {Object.entries(r)
                            .filter(([key]) => key !== "brand_tier_rankings")
                            .map(([key, v]) => (
                              <div key={key}>
                                <dt>{key}</dt>
                                <dd>
                                  {typeof v === "object"
                                    ? JSON.stringify(v)
                                    : String(v)}
                                </dd>
                              </div>
                            ))}
                        </dl>
                      </details>
                    )}
                  </article>
                ))}
              </div>
              {textRows.length > visibleTextCount && (
                <button
                  className="load-more"
                  onClick={() => setVisibleTextCount((n) => n + 12)}
                >
                  Show 12 more · {visibleTextCount} of {textRows.length}
                </button>
              )}
            </Section>
          </>
        )}
        <footer className="admin-footer">
          BRAND PULSE / NIKE{" "}
          <span>
            {publicAccess ? "Public results" : "Private results"} · Survey
            version {VERSION}
          </span>
        </footer>
      </main>
    </div>
  );
}
