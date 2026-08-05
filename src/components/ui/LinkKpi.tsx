import Link from "next/link";
import React from "react";

/**
 * Server-safe KPI tile that behaves like a Kpi but is a real anchor —
 * so keyboard users get focus + hover for free.
 */
export function LinkKpi({
  href,
  label,
  value,
  unit,
  delta,
  deltaKind = "neutral",
  note,
  extra,
}: {
  href: string;
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: string;
  deltaKind?: "up" | "down" | "neutral";
  note?: string;
  extra?: React.ReactNode;
}) {
  return (
    <Link className="kpi clickable" href={href} style={{ display: "block", color: "inherit" }}>
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      {(delta || note) && (
        <div className="foot">
          {delta ? <span className={"delta " + deltaKind}>{delta}</span> : null}
          {note ? <span className="note">{note}</span> : null}
        </div>
      )}
      {extra}
    </Link>
  );
}
