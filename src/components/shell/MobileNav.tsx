"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Mobile drawer wrapper. Renders the hamburger button in the topbar and the
 * off-canvas drawer that slides in over the page. The sidebar HTML itself is
 * cloned inside the drawer via portal-free simple children so we don't
 * duplicate its data-fetching.
 *
 * Autoclose on route change so tapping a nav item takes you there and closes.
 */
export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close whenever the URL changes
  useEffect(() => { setOpen(false); }, [pathname]);

  // Esc to close + lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        className="hamburger"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
      >
        <span /><span /><span />
      </button>

      <div
        className={"mobile-scrim" + (open ? " open" : "")}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        className={"mobile-drawer" + (open ? " open" : "")}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <div className="mobile-drawer-head">
          <div className="brand-name">Event<em>bot</em></div>
          <button
            className="drawer-close"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            type="button"
          >
            ×
          </button>
        </div>
        <div className="mobile-drawer-body">{children}</div>
      </div>
    </>
  );
}
