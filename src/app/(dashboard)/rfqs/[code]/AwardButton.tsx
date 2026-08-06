"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { awardRfq } from "../actions";
import { toast } from "@/components/ui/Toast";

type Props = {
  rfqId: number;
  vendorId: number;
  vendorName: string;
  label?: string;
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
};

/**
 * Awards an RFQ to a specific vendor. Used both in the header (defaults to
 * the lowest bid) and inline in the compare grid ("Award" per vendor row).
 */
export function AwardButton({
  rfqId,
  vendorId,
  vendorName,
  label = "Award",
  variant = "primary",
  size = "md",
  disabled,
}: Props) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();

  function onClick() {
    if (disabled) return;
    if (!confirm(`Award this RFQ to ${vendorName}?\nAll other submitted quotes will be marked declined.`)) return;
    startSaving(async () => {
      const res = await awardRfq({ rfqId, vendorId });
      if (res.ok) {
        toast(`Awarded to ${vendorName}`, "ok");
        router.refresh();
      } else {
        toast(res.error, "err");
      }
    });
  }

  const style = size === "sm" ? { padding: "4px 10px", fontSize: 12 } : undefined;
  return (
    <button
      type="button"
      className={"btn" + (variant === "primary" ? " primary" : " ghost")}
      style={style}
      onClick={onClick}
      disabled={disabled || saving}
      aria-label={`Award RFQ to ${vendorName}`}
    >
      {saving ? "Awarding…" : label}
    </button>
  );
}
