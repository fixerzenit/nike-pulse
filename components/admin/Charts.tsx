"use client";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Label,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import type { Response } from "@/lib/validation";
import { weightedMean, type WeightMode } from "@/lib/analytics";
export function Matrix({
  rows,
  min,
  max,
  midpoint,
  weightMode,
}: {
  rows: Response[];
  min: number;
  max: number;
  midpoint: number;
  weightMode: WeightMode;
}) {
  const culture =
    weightedMean(rows, weightMode, (r) => r.culture_score) ?? midpoint;
  const product =
    weightedMean(rows, weightMode, (r) => r.product_innovation_score) ??
    midpoint;
  const ticks = min === 0 ? [0, 2, 4, 6, 8, 10] : [1, 2, 3, 4, 5, 6, 7];
  const counts: Record<string, { x: number; y: number; count: number }> = {};
  rows.forEach((r) => {
    const key = `${r.product_innovation_score}-${r.culture_score}`;
    counts[key] ??= {
      x: r.product_innovation_score,
      y: r.culture_score,
      count: 0,
    };
    counts[key].count++;
  });
  return (
    <div className="matrix">
      <div className="quadrants">
        <span>HIGH CULTURE / LOW PRODUCT</span>
        <span>HIGH CULTURE / HIGH PRODUCT</span>
        <span>LOW CULTURE / LOW PRODUCT</span>
        <span>LOW CULTURE / HIGH PRODUCT</span>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 28, right: 24, bottom: 30, left: 0 }}>
          <CartesianGrid stroke="#e5e6df" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[min, max]}
            ticks={ticks}
            name="Product innovation"
          >
            <Label value="Product innovation →" position="bottom" offset={10} />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            domain={[min, max]}
            ticks={ticks}
            name="Cultural relevance"
          >
            <Label
              value="Cultural relevance →"
              angle={-90}
              position="insideLeft"
            />
          </YAxis>
          <ReferenceLine x={midpoint} stroke="#a0a0a0" />
          <ReferenceLine y={midpoint} stroke="#a0a0a0" />
          <ReferenceLine x={product} stroke="#912ddc" strokeDasharray="4 4" />
          <ReferenceLine y={culture} stroke="#912ddc" strokeDasharray="4 4" />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="chart-tooltip">
                  Product {payload[0].payload.x} · Culture{" "}
                  {payload[0].payload.y}
                  <br />
                  {payload[0].payload.count ?? "Mean"}{" "}
                  {payload[0].payload.count ? "responses" : ""}
                </div>
              ) : null
            }
          />
          <Scatter
            name="Respondents"
            data={Object.values(counts)}
            fill="#1b24f1"
            fillOpacity={0.55}
          />
          <Scatter
            name="Mean"
            data={[{ x: product, y: culture }]}
            fill="#ff2200"
            shape="diamond"
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="hint">
        ● Responses at each score pair (hover for count) · ◆ Mean · Dashed
        lines: averages · Midpoint: {midpoint}
      </p>
    </div>
  );
}
export function PurchaseScatter({
  rows,
  metric,
  measure,
  scoreMin,
  scoreMax,
}: {
  rows: Response[];
  measure: "purchase_consideration" | "apparel_purchase_consideration";
  metric: "overall_perception" | "culture_score" | "product_innovation_score";
  scoreMin: number;
  scoreMax: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 25, left: 0 }}>
        <CartesianGrid stroke="#e8e9e2" />
        <XAxis
          type="number"
          dataKey="x"
          domain={[scoreMin, scoreMax]}
          ticks={scoreMin === 0 ? [0, 2, 4, 6, 8, 10] : [1, 2, 3, 4, 5, 6, 7]}
          name="Perception score"
        >
          <Label value="Perception score" position="bottom" />
        </XAxis>
        <YAxis
          type="number"
          dataKey="y"
          domain={[0, 10]}
          name={
            measure === "purchase_consideration"
              ? "Sneaker consideration"
              : "Apparel consideration"
          }
        />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
        <Scatter
          fill="#912ddc"
          fillOpacity={0.5}
          data={rows.map((r) => ({
            x: r[metric],
            y: r[measure],
          }))}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
export function Distribution({
  data,
  midpoint,
  weighted,
}: {
  data: { value: number; count: number }[];
  midpoint: number;
  weighted: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data}>
        <XAxis dataKey="value" />
        <YAxis allowDecimals={weighted} />
        <Tooltip
          formatter={(value) => [
            Number(value).toFixed(weighted ? 1 : 0),
            weighted ? "Weighted responses" : "Responses",
          ]}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((d) => (
            <Cell
              key={d.value}
              fill={
                d.value < midpoint
                  ? "#ff2200"
                  : d.value === midpoint
                    ? "#ffb939"
                    : "#1b24f1"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
