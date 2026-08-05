"use client";

import { ThemeToggle } from "./ThemeToggle";
import { RoleToggle } from "./RoleToggle";

export function Topbar() {
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
        <div className="avatar" title="Nikhil Bansal · Head Producer">NB</div>
      </div>
    </header>
  );
}
