"use client";

import { useState } from "react";

export function Donut({
  segments,
  size = 140,
  thick = 20,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  size?: number;
  thick?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const R = size / 2;
  const r = R - thick / 2;

  // Precompute arc geometry. Round to 3 decimals so the server-rendered SVG
  // string matches the client's exactly — otherwise React flags a hydration
  // mismatch when floating-point serialization differs across V8 versions.
  const round = (n: number) => Number.isFinite(n) ? Math.round(n * 1000) / 1000 : n;
  let a0 = -Math.PI / 2;
  const arcs = segments.map((s) => {
    const a1 = a0 + (s.value / total) * Math.PI * 2;
    const x0 = round(R + r * Math.cos(a0));
    const y0 = round(R + r * Math.sin(a0));
    const x1 = round(R + r * Math.cos(a1));
    const y1 = round(R + r * Math.sin(a1));
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
    const mid = (a0 + a1) / 2;
    a0 = a1;
    return { d, mid, ...s };
  });

  const active = hover != null ? arcs[hover] : null;

  return (
    <div style={{ position: "relative", display: "grid", placeItems: "center", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={R} cy={R} r={r} stroke="var(--outline)" strokeWidth={thick} fill="none" />
        {arcs.map((a, i) => (
          <path
            key={`arc-${a.label}`}
            d={a.d}
            stroke={a.color}
            strokeWidth={hover === i ? thick + 4 : thick}
            fill="none"
            strokeLinecap="butt"
            style={{ transition: "stroke-width 140ms ease, opacity 140ms", opacity: hover == null || hover === i ? 1 : 0.4, cursor: "pointer" }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <title>{`${a.label}: ${a.value} (${Math.round((a.value / total) * 100)}%)`}</title>
          </path>
        ))}
      </svg>
      {/* Center label. `data-donut-center` gives tests a stable hook that
          doesn't collide with the SVG <title> tooltips inside the arcs. */}
      <div data-donut-center style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none", textAlign: "center" }}>
        {active ? (
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-2)", fontWeight: 700 }}>{active.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>{active.value}</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{Math.round((active.value / total) * 100)}%</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-2)", fontWeight: 700 }}>Total</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--ink)" }}>{total}</div>
          </div>
        )}
      </div>
    </div>
  );
}
