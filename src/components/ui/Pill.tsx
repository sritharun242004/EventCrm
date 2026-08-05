import React from "react";

export function Pill({
  kind,
  dot,
  children,
}: {
  kind: "live" | "confirmed" | "production" | "completed" | "proposed" | "lead";
  dot?: boolean;
  children: React.ReactNode;
}) {
  return <span className={"pill " + kind + (dot ? " dot" : "")}>{children}</span>;
}
