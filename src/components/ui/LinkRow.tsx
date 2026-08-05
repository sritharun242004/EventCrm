"use client";

import { useRouter } from "next/navigation";

/**
 * A whole-row click target that stays valid HTML (<tr>) but navigates on click,
 * with keyboard + right-click affordances preserved. Anchors inside individual
 * cells still work — this only fires when the target isn't itself interactive.
 */
export function LinkRow({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <tr
      className="clickable"
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest("a, button, input, select, textarea")) return;
        router.push(href);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      tabIndex={0}
    >
      {children}
    </tr>
  );
}
