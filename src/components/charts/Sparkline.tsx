"use client";

import { useState } from "react";

export function Sparkline({
  points,
  width = 90,
  height = 30,
  stroke = "var(--primary)",
  fill = "var(--primary-tint)",
  accent = true,
  labels,
}: {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  accent?: boolean;
  labels?: string[]; // optional per-point label for hover tooltip
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = width / Math.max(1, points.length - 1);
  const pts = points.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 4) - 2,
    v,
    label: labels?.[i] ?? String(i + 1),
  }));
  const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");
  const area = d + ` L ${width.toFixed(1)} ${height} L 0 ${height} Z`;
  const last = pts[pts.length - 1];
  const active = hover != null ? pts[hover] : null;

  return (
    <div style={{ position: "relative", width, height }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: "block" }}
        onMouseLeave={() => setHover(null)}
      >
        <path d={area} fill={fill} opacity={0.55} />
        <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {accent && !active ? <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r={2.5} fill={stroke} /> : null}
        {active ? <circle cx={active.x.toFixed(1)} cy={active.y.toFixed(1)} r={3} fill={stroke} stroke="var(--surface)" strokeWidth={1.5} /> : null}
        {/* Invisible hit-zones */}
        {pts.map((p, i) => (
          <rect
            key={`hz-${i}`}
            x={Math.max(0, p.x - step / 2)}
            y={0}
            width={step}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>
      {active ? (
        <div
          style={{
            position: "absolute",
            left: Math.max(0, Math.min(width - 60, active.x - 30)),
            top: -28,
            pointerEvents: "none",
            background: "var(--ink)",
            color: "var(--surface)",
            padding: "2px 6px",
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {active.label}
        </div>
      ) : null}
    </div>
  );
}
