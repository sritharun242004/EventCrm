import React from "react";

export function KpiRow({ children }: { children: React.ReactNode }) {
  return <div className="kpi-row">{children}</div>;
}

export function Kpi({
  label,
  value,
  unit,
  delta,
  deltaKind = "neutral",
  note,
  extra,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  delta?: string;
  deltaKind?: "up" | "down" | "neutral";
  note?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="kpi">
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
    </div>
  );
}
