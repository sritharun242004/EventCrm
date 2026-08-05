"use client";

import { ThemeToggle } from "./ThemeToggle";
import { RoleToggle } from "./RoleToggle";
import { MobileNav } from "./MobileNav";
import { logout } from "@/app/login/actions";

export function Topbar({
  email,
  mobileNavChildren,
}: {
  email: string;
  mobileNavChildren: React.ReactNode;
}) {
  const initials = email
    .split("@")[0]
    .split(/[.\-_]/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

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
        <RoleToggle />
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
