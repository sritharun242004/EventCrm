"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SidebarItem = { href: string; label: string; count?: number };
export type SidebarGroup = { group: string; items: SidebarItem[] };

/**
 * Dumb sidebar — receives pre-filtered groups from the layout. Filtering by
 * role happens on the server via can(user, "view.<page>").
 */
export function Sidebar({ groups }: { groups: SidebarGroup[] }) {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      {groups.map((g) => (
        <div className="nav-group" key={g.group}>
          <div className="nav-group-title">{g.group}</div>
          {g.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className={"nav-item " + (active ? "active" : "")}>
                <span>{item.label}</span>
                {typeof item.count === "number" ? <span className="count">{item.count}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
