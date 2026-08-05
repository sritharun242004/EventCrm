"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; text: string; kind?: "ok" | "err" };

let nextId = 1;
const listeners = new Set<(t: Toast | { drop: number }) => void>();

/**
 * Fire a toast. If a toast with the exact same text is already visible,
 * we bump its lifetime instead of stacking a duplicate. Cap of 3 visible
 * at a time — older ones fade out as new ones arrive.
 */
export function toast(text: string, kind?: "ok" | "err") {
  const t: Toast = { id: nextId++, text, kind };
  listeners.forEach((l) => l(t));
}

const MAX_VISIBLE = 3;
const TTL_MS = 2400;

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const push = (msg: Toast | { drop: number }) => {
      if ("drop" in msg) {
        setItems((prev) => prev.filter((x) => x.id !== msg.drop));
        return;
      }
      setItems((prev) => {
        // Dedupe: if the same text is already showing, drop the previous
        // instance so it visually resets rather than stacking.
        const withoutDupes = prev.filter((x) => x.text !== msg.text);
        // Enforce cap
        const trimmed = withoutDupes.slice(-(MAX_VISIBLE - 1));
        return [...trimmed, msg];
      });
      // Auto-dismiss
      setTimeout(() => {
        listeners.forEach((l) => l({ drop: msg.id }));
      }, TTL_MS);
    };
    listeners.add(push);
    return () => { listeners.delete(push); };
  }, []);

  return (
    <div className="toast-host">
      {items.map((t) => (
        <div key={t.id} className={"toast " + (t.kind ?? "")}>{t.text}</div>
      ))}
    </div>
  );
}

/** Placeholder button that emits a toast — useful for controls not yet wired up. */
export function ActionButton({
  label,
  toastMsg,
  variant = "default",
  className,
  style,
}: {
  label: string;
  toastMsg: string;
  variant?: "default" | "primary" | "ghost";
  className?: string;
  style?: React.CSSProperties;
}) {
  const cls = "btn" + (variant === "primary" ? " primary" : variant === "ghost" ? " ghost" : "");
  return (
    <button className={cls + (className ? " " + className : "")} style={style} onClick={() => toast(toastMsg, "ok")}>
      {label}
    </button>
  );
}
