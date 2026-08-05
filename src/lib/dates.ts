/**
 * Date helpers, IN locale.
 */

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function fmtDateFull(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function daysBetween(a: Date, b: Date): number {
  const MS = 1000 * 60 * 60 * 24;
  return Math.round((a.getTime() - b.getTime()) / MS);
}

/** "in 12 days" / "tomorrow" / "3 days ago" relative to `now`. */
export function daysFrom(iso: Date | string, now: Date = new Date()): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = daysBetween(d, now);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

export const nf = new Intl.NumberFormat("en-IN");
