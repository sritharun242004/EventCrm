"use client";

import { ThemeToggle } from "./ThemeToggle";
import { RoleToggle } from "./RoleToggle";
import { logout } from "@/app/login/actions";

export function Topbar({ email }: { email: string }) {
  return (
    <header className="topbar">
      <div className="brand">
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
          <button className="avatar avatar-button" type="submit" title={`${email} · Sign out`} aria-label={`Sign out ${email}`}>TK</button>
        </form>
      </div>
    </header>
  );
}
