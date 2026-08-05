"use client";

import Link from "next/link";
import { useState, useTransition, useMemo } from "react";
import type { EventStatus } from "@prisma/client";
import { updateEventStatus } from "./actions";
import { toast } from "@/components/ui/Toast";
import { moneyShort, pct } from "@/lib/money";
import { fmtDate } from "@/lib/dates";
import { statusClass, statusLabel, typeLabel } from "@/lib/format";
import { Pill } from "@/components/ui/Pill";
import { Meter } from "@/components/ui/Meter";

type Card = {
  id: number;
  code: string;
  name: string;
  type: string;
  status: EventStatus;
  clientName: string | null;
  venueName: string | null;
  teamName: string | null;
  teamId: number | null;
  startsOn: string;
  endsOn: string;
  projectedCents: number;
  spentCents: number;
  budgetCents: number;
};

const STATUS_COLS: Array<{ key: EventStatus; title: string; bucket: EventStatus[] }> = [
  { key: "lead",          title: "Lead",              bucket: ["lead"] },
  { key: "proposed",      title: "Proposed",          bucket: ["proposed"] },
  { key: "confirmed",     title: "Confirmed",         bucket: ["confirmed"] },
  { key: "in_production", title: "In Production / Live", bucket: ["in_production", "live"] },
  { key: "completed",     title: "Completed",         bucket: ["completed", "wrap_up"] },
];

export function EventsKanban({
  cards: initialCards,
  groupBy = "status",
}: {
  cards: Card[];
  groupBy?: "status" | "team";
}) {
  const [cards, setCards] = useState(initialCards);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // ============ Team grouping (read-only, drag disabled) ============
  const teamCols = useMemo(() => {
    if (groupBy !== "team") return [];
    const map = new Map<string, { key: string; title: string; items: Card[] }>();
    cards.forEach((c) => {
      const key = c.teamId != null ? String(c.teamId) : "unassigned";
      const title = c.teamName ?? "Unassigned";
      if (!map.has(key)) map.set(key, { key, title, items: [] });
      map.get(key)!.items.push(c);
    });
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [cards, groupBy]);

  function grouped(status: EventStatus) {
    const b = STATUS_COLS.find((c) => c.key === status)!.bucket;
    return cards.filter((c) => b.includes(c.status));
  }

  function onDragStart(id: number) {
    setDraggingId(id);
  }
  function onDragEnd() {
    setDraggingId(null);
    setHoverCol(null);
  }
  function onDrop(target: EventStatus) {
    if (draggingId == null) return;
    const card = cards.find((c) => c.id === draggingId);
    if (!card || card.status === target) {
      setDraggingId(null);
      setHoverCol(null);
      return;
    }
    const previous = card.status;
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: target } : c)));
    setDraggingId(null);
    setHoverCol(null);
    startSaving(async () => {
      const res = await updateEventStatus(card.id, target);
      if (res.ok) {
        toast(`${card.name} → ${statusLabel(target)}`, "ok");
      } else {
        setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: previous } : c)));
        toast(res.error, "err");
      }
    });
  }

  // ============ TEAM VIEW ============
  if (groupBy === "team") {
    return (
      <div className="kanban" data-view="team" style={{ gridTemplateColumns: `repeat(${Math.max(teamCols.length, 1)}, minmax(220px, 1fr))` }}>
        {teamCols.map((col) => (
          <div key={col.key} className="kanban-col">
            <h4>
              <span>{col.title}</span>
              <span className="n">{col.items.length}</span>
            </h4>
            {col.items.map((e) => (
              <Link
                href={`/events/${e.code}`}
                key={e.id}
                className={`k-card st-${statusClass(e.status)}`}
              >
                <div className="flex between">
                  <Pill kind={statusClass(e.status) as any} dot>{statusLabel(e.status)}</Pill>
                  <span className="subtle">{e.code}</span>
                </div>
                <div className="k-title" style={{ marginTop: 6 }}>{e.name}</div>
                <div className="k-meta">
                  <span className="muted" style={{ fontSize: 11 }}>{typeLabel(e.type)}</span>
                  <span className="subtle">·</span>
                  <span className="muted" style={{ fontSize: 11 }}>{e.clientName ?? "—"}</span>
                </div>
                <div className="k-foot">
                  <span>
                    {fmtDate(e.startsOn)}
                    {new Date(e.endsOn).getTime() !== new Date(e.startsOn).getTime() ? " — " + fmtDate(e.endsOn) : ""}
                  </span>
                  <b>{moneyShort(e.projectedCents)}</b>
                </div>
              </Link>
            ))}
            {col.items.length === 0 && <div className="col-empty">No events</div>}
          </div>
        ))}
      </div>
    );
  }

  // ============ STATUS VIEW (default, drag+drop) ============
  return (
    <div className="kanban" data-saving={saving ? "1" : "0"} data-view="status">
      {STATUS_COLS.map((c) => {
        const list = grouped(c.key);
        const isTarget = hoverCol === c.key;
        return (
          <div
            key={c.key}
            className={"kanban-col" + (isTarget ? " drag-over" : "")}
            onDragOver={(e) => {
              e.preventDefault();
              if (hoverCol !== c.key) setHoverCol(c.key);
            }}
            onDragLeave={() => setHoverCol((h) => (h === c.key ? null : h))}
            onDrop={(e) => {
              e.preventDefault();
              onDrop(c.key);
            }}
          >
            <h4>
              <span>{c.title}</span>
              <span className="n">{list.length}</span>
            </h4>
            {list.map((e) => {
              const spentPct = pct(e.spentCents, e.budgetCents);
              const dragging = draggingId === e.id;
              return (
                <Link
                  href={`/events/${e.code}`}
                  className={`k-card st-${statusClass(e.status)}` + (dragging ? " is-dragging" : "")}
                  key={e.id}
                  draggable
                  onDragStart={(ev) => {
                    ev.stopPropagation();
                    ev.dataTransfer.effectAllowed = "move";
                    ev.dataTransfer.setData("text/plain", String(e.id));
                    onDragStart(e.id);
                  }}
                  onDragEnd={onDragEnd}
                  onClick={(ev) => {
                    if (draggingId != null) ev.preventDefault();
                  }}
                >
                  <div className="flex between">
                    <Pill kind={statusClass(e.status) as any} dot>{statusLabel(e.status)}</Pill>
                    <span className="subtle">{e.code}</span>
                  </div>
                  <div className="k-title" style={{ marginTop: 6 }}>{e.name}</div>
                  <div className="k-meta">
                    <span className="muted" style={{ fontSize: 11 }}>{typeLabel(e.type)}</span>
                    <span className="subtle">·</span>
                    <span className="muted" style={{ fontSize: 11 }}>{e.clientName ?? "—"}</span>
                  </div>
                  <div className="k-foot">
                    <span>
                      {fmtDate(e.startsOn)}
                      {new Date(e.endsOn).getTime() !== new Date(e.startsOn).getTime() ? " — " + fmtDate(e.endsOn) : ""}
                    </span>
                    <b>{moneyShort(e.projectedCents)}</b>
                  </div>
                  <Meter value={Math.min(spentPct, 100)} kind={spentPct > 90 ? "warn" : undefined} style={{ marginTop: 8, height: 3 }} />
                  <div className="subtle" style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                    <span>{e.venueName ?? "—"}</span>
                    <span>{e.teamName ?? "—"}</span>
                  </div>
                </Link>
              );
            })}
            {list.length === 0 && <div className="col-empty">Drop here to move</div>}
          </div>
        );
      })}
    </div>
  );
}
