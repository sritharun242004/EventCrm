"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Counts = { events: number; vendors: number; teams: number; rfqs: number };

/**
 * The sidebar carries hierarchy through typography, not glyphs or pills.
 * Active state is a small filled square in the margin — the whole point
 * of the treatment is that you should be able to scan the list like a
 * printed table of contents.
 */
const NAV: Array<{
  group: string;
  items: Array<{ href: string; label: string; count?: (c: Counts) => number }>;
}> = [
  {
    group: "Programme",
    items: [
      { href: "/overview",  label: "Overview" },
      { href: "/events",    label: "Events",   count: (c) => c.events },
      { href: "/calendar",  label: "Calendar" },
    ],
  },
  {
    group: "Production",
    items: [
      { href: "/proposals", label: "Proposal Factory" },
      { href: "/vendors",   label: "Vendors",  count: (c) => c.vendors },
      { href: "/budgets",   label: "Budgets"  },
      { href: "/rfqs",      label: "RFQs",     count: (c) => c.rfqs },
      { href: "/teams",     label: "Teams",    count: (c) => c.teams },
    ],
  },
  {
    group: "Signals",
    items: [
      { href: "/reputation", label: "Reputation" },
      { href: "/market",     label: "Market" },
    ],
  },
];

export function Sidebar({ counts }: { counts: Counts }) {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      {NAV.map((g) => (
        <div className="nav-group" key={g.group}>
          <div className="nav-group-title">{g.group}</div>
          {g.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"nav-item " + (active ? "active" : "")}
              >
                <span>{item.label}</span>
                {item.count ? <span className="count">{item.count(counts)}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
