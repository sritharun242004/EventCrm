"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { markAllNotificationsRead } from "@/app/api/comments/actions";

type Notif = {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  linkUrl: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const unread = notifs.filter((n) => !n.readAt).length;

  async function refresh() {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as { notifications: Notif[] };
      setNotifs(j.notifications);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="Notifications"
        className="relative rounded p-1.5 hover:bg-slate-100"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 rounded-full bg-red-600 text-white text-[10px] font-medium px-1.5"
            style={{ minWidth: 16, height: 16, lineHeight: "16px", textAlign: "center" }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-50"
        >
          <div className="flex items-center justify-between border-b p-3">
            <div className="text-sm font-medium">Notifications</div>
            {unread > 0 && (
              <form
                action={async () => {
                  await markAllNotificationsRead();
                  refresh();
                }}
              >
                <button className="text-xs text-slate-600 underline">Mark all read</button>
              </form>
            )}
          </div>
          {notifs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">Nothing new.</div>
          ) : (
            <ul>
              {notifs.map((n) => (
                <li key={n.id} className={"border-b border-slate-100 p-3 " + (!n.readAt ? "bg-blue-50/40" : "")}>
                  <Link href={n.linkUrl} onClick={() => setOpen(false)}>
                    <div className="text-sm">{n.title}</div>
                    {n.body && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{n.body}</div>}
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
