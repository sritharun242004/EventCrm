"use client";

import { useEffect, useRef, useState } from "react";

type Toast = { id: number; text: string; kind?: "ok" | "err" };

let nextId = 1;
const listeners = new Set<(t: Toast) => void>();

/** Fire a toast. Dedupes by exact text — refires refresh the visible timer. */
export function toast(text: string, kind?: "ok" | "err") {
  const t: Toast = { id: nextId++, text, kind };
  listeners.forEach((l) => l(t));
}

const MAX_VISIBLE = 3;
const TTL_MS = 3000;

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const clearTimer = (id: number) => {
      const t = timersRef.current.get(id);
      if (t) { clearTimeout(t); timersRef.current.delete(id); }
    };

    const dismiss = (id: number) => {
      clearTimer(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    };

    const push = (msg: Toast) => {
      setItems((prev) => {
        // Drop any prior toast with the same text (its timer is stale)
        prev.filter((x) => x.text === msg.text).forEach((x) => clearTimer(x.id));
        const withoutDupes = prev.filter((x) => x.text !== msg.text);
        // Enforce visible cap
        const overflow = withoutDupes.slice(0, Math.max(0, withoutDupes.length - (MAX_VISIBLE - 1)));
        overflow.forEach((x) => clearTimer(x.id));
        const trimmed = withoutDupes.slice(-(MAX_VISIBLE - 1));
        return [...trimmed, msg];
      });
      // Start / restart auto-dismiss timer
      timersRef.current.set(msg.id, setTimeout(() => dismiss(msg.id), TTL_MS));
    };

    listeners.add(push);
    // Expose a dismiss handler on the host element for click-to-close
    (ToastHost as any)._dismiss = dismiss;
    return () => {
      listeners.delete(push);
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  return (
    <div className="toast-host">
      {items.map((t) => (
        <button
          key={t.id}
          className={"toast " + (t.kind ?? "")}
          onClick={() => (ToastHost as any)._dismiss?.(t.id)}
          title="Dismiss"
          type="button"
        >
          {t.text}
          <span aria-hidden="true" style={{ marginLeft: 10, opacity: 0.55 }}>×</span>
        </button>
      ))}
    </div>
  );
}

/** Placeholder button — emits a toast. */
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
    <button
      className={cls + (className ? " " + className : "")}
      style={style}
      onClick={() => toast(toastMsg, "ok")}
      type="button"
    >
      {label}
    </button>
  );
}
