"use client";

import { useRole } from "@/components/shell/RoleToggle";

/**
 * Client-only wrapper that swaps the KPI strip depending on the current role.
 * Both variants are computed on the server and passed down as pre-rendered
 * ReactNodes — the switch itself is a cheap DOM toggle.
 */
export function OverviewKpiSwitcher({
  ceo,
  mgr,
}: {
  ceo: React.ReactNode;
  mgr: React.ReactNode;
}) {
  const role = useRole();
  return <>{role === "ceo" ? ceo : mgr}</>;
}
