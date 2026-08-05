/**
 * Money helpers.
 *
 * Everything on the wire and in the DB is BigInt paise (INR). Never use floats
 * for money arithmetic — convert to a display string only at the edge.
 */

const rupeeFmt = new Intl.NumberFormat("en-IN");

/** Convert BigInt paise -> Number rupees. Only safe for display. */
function toRupees(paise: bigint | number | null | undefined): number {
  if (paise == null) return 0;
  const v = typeof paise === "bigint" ? Number(paise) : paise;
  return v / 100;
}

/** ₹12,34,567 style (precise). */
export function money(paise: bigint | number | null | undefined): string {
  const r = Math.round(toRupees(paise));
  return "₹" + rupeeFmt.format(r);
}

/** Short form: ₹2.4 Cr / ₹56 L / ₹1,200. Ideal for KPIs. */
export function moneyShort(paise: bigint | number | null | undefined): string {
  const r = toRupees(paise);
  if (r >= 1_00_00_000) return "₹" + (r / 1_00_00_000).toFixed(2) + " Cr";
  if (r >= 1_00_000) return "₹" + (r / 1_00_000).toFixed(2) + " L";
  return "₹" + rupeeFmt.format(Math.round(r));
}

/** Add two BigInt-ish paise values safely. */
export function addPaise(
  a: bigint | number | null | undefined,
  b: bigint | number | null | undefined,
): bigint {
  const aa = a == null ? 0n : typeof a === "bigint" ? a : BigInt(Math.round(a));
  const bb = b == null ? 0n : typeof b === "bigint" ? b : BigInt(Math.round(b));
  return aa + bb;
}

/** Sum a list. */
export function sumPaise<T>(list: T[], get: (t: T) => bigint | number | null | undefined): bigint {
  return list.reduce<bigint>((acc, t) => addPaise(acc, get(t)), 0n);
}

/** Integer percent, safe if divisor is 0. */
export function pct(part: bigint | number | null | undefined, whole: bigint | number | null | undefined): number {
  const p = toRupees(part);
  const w = toRupees(whole);
  if (!w) return 0;
  return Math.round((p / w) * 100);
}
