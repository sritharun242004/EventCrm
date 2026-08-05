"use client";

import { useState } from "react";
import { moneyShort } from "@/lib/money";

/**
 * Twin-bar month chart: actual vs projected. Values arrive in rupees (already
 * divided from paise upstream) for chart math; formatters expect paise so we
 * multiply back on display.
 *
 * Interactive: hovering a month highlights both bars and shows a tooltip
 * with actual + projected + delta.
 */
export function DualBar({
  data,
  width = 720,
  height = 220,
}: {
  data: Array<{ label: string; actual: number; projected: number }>;
  width?: number;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const max = Math.max(...data.map((d) => Math.max(d.actual, d.projected)), 1);
  const barW = 22;
  const gap = (width - data.length * barW * 2 - 60) / (data.length + 1);
  const yLines = [0, 0.5, 1].map((t) => ({
    t,
    y: height - 40 - t * (height - 62),
    label: moneyShort(Math.round(max * t * 100)),
  }));

  return (
    <div style={{ overflowX: "auto", position: "relative" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ display: "block", minWidth: 640, cursor: "crosshair" }}
        onMouseLeave={() => setHover(null)}
      >
        {yLines.map((l) => (
          <g key={`yl-${l.t}`}>
            <line x1={30} y1={l.y} x2={width} y2={l.y} stroke="var(--grid)" />
            <text x={4} y={l.y + 3} fontSize={9} fill="var(--ink-3)" fontWeight={600}>
              {l.label}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = 30 + gap + i * (barW * 2 + gap);
          const ha = (d.actual / max) * (height - 62);
          const hp = (d.projected / max) * (height - 62);
          const highlighted = hover === i;
          const hitW = barW * 2 + gap;
          return (
            <g key={`bar-${d.label}`}>
              {/* invisible hit-zone for the whole month, wider than bars */}
              <rect
                x={x - gap / 2}
                y={0}
                width={hitW}
                height={height - 40}
                fill="transparent"
                onMouseEnter={(e) => {
                  setHover(i);
                  setPos({ x: (e.nativeEvent as MouseEvent).offsetX, y: (e.nativeEvent as MouseEvent).offsetY });
                }}
                onMouseMove={(e) => {
                  setPos({ x: (e.nativeEvent as MouseEvent).offsetX, y: (e.nativeEvent as MouseEvent).offsetY });
                }}
                style={{ cursor: "pointer" }}
              />
              <rect
                x={x}
                y={height - 40 - hp}
                width={barW}
                height={hp}
                rx={2}
                fill="var(--info)"
                opacity={highlighted ? 1 : d.actual ? 0.35 : 1}
                style={{ transition: "opacity 150ms" }}
              />
              <rect
                x={x + barW + 2}
                y={height - 40 - ha}
                width={barW}
                height={ha}
                rx={2}
                fill="var(--primary)"
                opacity={highlighted ? 1 : 0.9}
                style={{ transition: "opacity 150ms" }}
              />
              <text
                x={x + barW + 1}
                y={height - 22}
                textAnchor="middle"
                fontSize={10}
                fill={highlighted ? "var(--ink)" : "var(--ink-2)"}
                fontWeight={highlighted ? 700 : 600}
              >
                {d.label}
              </text>
              {highlighted && (
                <line
                  x1={x - gap / 2}
                  x2={x - gap / 2 + hitW}
                  y1={height - 40}
                  y2={height - 40}
                  stroke="var(--primary)"
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}
      </svg>

      {hover != null && (() => {
        const d = data[hover];
        const delta = d.actual - d.projected;
        return (
          <div
            role="tooltip"
            style={{
              position: "absolute",
              left: Math.min(pos.x + 14, 560),
              top: Math.max(pos.y - 78, 8),
              pointerEvents: "none",
              background: "var(--surface)",
              border: "1px solid var(--outline-strong)",
              borderRadius: 6,
              boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
              padding: "8px 12px",
              minWidth: 180,
              zIndex: 5,
              transition: "left 60ms linear, top 60ms linear",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-2)" }}>{d.label} · FY26</div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6, fontSize: 12 }}>
              <span style={{ color: "var(--primary)", fontWeight: 700 }}>Actual</span>
              <b>{moneyShort(Math.round(d.actual * 100))}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
              <span style={{ color: "var(--info)", fontWeight: 700 }}>Projected</span>
              <b>{moneyShort(Math.round(d.projected * 100))}</b>
            </div>
            {d.projected > 0 && d.actual > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--outline)", fontSize: 11 }}>
                <span className="muted">Variance</span>
                <b style={{ color: delta >= 0 ? "var(--success)" : "var(--critical)" }}>
                  {delta >= 0 ? "+" : ""}{moneyShort(Math.round(delta * 100))}
                </b>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
