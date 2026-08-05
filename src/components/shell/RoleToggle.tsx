"use client";

import { useEffect, useState } from "react";

export type Role = "ceo" | "mgr";

/**
 * Persists the current dashboard role in localStorage and fires a `role-change`
 * event so any listening client component (e.g. the Overview page's KPI strip)
 * can re-render without a full navigation.
 */
export function RoleToggle() {
  const [role, setRole] = useState<Role>("ceo");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("role")) as Role | null;
    if (saved) setRole(saved);
  }, []);

  function set(next: Role) {
    setRole(next);
    localStorage.setItem("role", next);
    window.dispatchEvent(new CustomEvent<Role>("role-change", { detail: next }));
  }

  return (
    <div className="role-toggle" role="tablist" aria-label="Dashboard role">
      <button
        className={role === "ceo" ? "on" : ""}
        onClick={() => set("ceo")}
        role="tab"
        aria-selected={role === "ceo"}
      >
        CEO
      </button>
      <button
        className={role === "mgr" ? "on" : ""}
        onClick={() => set("mgr")}
        role="tab"
        aria-selected={role === "mgr"}
      >
        Manager
      </button>
    </div>
  );
}

/** Client-side hook to subscribe to the current role. Defaults to 'ceo'. */
export function useRole(): Role {
  const [role, setRole] = useState<Role>("ceo");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("role")) as Role | null;
    if (saved) setRole(saved);
    function onChange(e: Event) {
      setRole((e as CustomEvent<Role>).detail);
    }
    window.addEventListener("role-change", onChange);
    return () => window.removeEventListener("role-change", onChange);
  }, []);
  return role;
}
