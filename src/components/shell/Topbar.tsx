"use client";

import { ThemeToggle } from "./ThemeToggle";
import { MobileNav } from "./MobileNav";
import { logout } from "@/app/login/actions";

const ROLE_LABELS: Record<string, string> = {
  ceo: "Owner",
  sales: "Sales",
  producer: "Producer",
  coordinator: "Coordinator",
  finance: "Finance",
};

export function Topbar({
  email,
  name,
  role,
  mobileNavChildren,
}: {
  email: string;
  name: string;
  role: string;
  mobileNavChildren: React.ReactNode;
}) {
  const initials =
    (name
      .split(/[\s._-]+/)
      .map((p) => p[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
      email[0]?.toUpperCase() ||
      "U");
  const roleLabel = ROLE_LABELS[role] ?? role;

  return (
    <header className="topbar">
      <div className="brand">
        <MobileNav>{mobileNavChildren}</MobileNav>
        <div className="brand-name">
          Event<em>bot</em>
        </div>
        <span className="brand-tag">Console</span>
      </div>

      <div className="search" role="search">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input placeholder="Find event, vendor, RFQ…" aria-label="Search" />
        <span className="kbd">⌘K</span>
      </div>

      <div className="top-actions">
        <span
          className="role-badge"
          title={`${name} — ${roleLabel}`}
          style={{
            fontSize: "0.7rem",
            padding: "0.15rem 0.5rem",
            borderRadius: "999px",
            background: "var(--container, #f1f5f9)",
            color: "var(--ink, #131b2e)",
            fontWeight: 500,
          }}
        >
          {roleLabel}
        </span>
        <ThemeToggle />
        <form action={logout}>
          <button
            className="avatar avatar-button"
            type="submit"
            title={`${email} · Sign out`}
            aria-label={`Sign out ${email}`}
          >
            {initials}
          </button>
        </form>
      </div>
    </header>
  );
}
