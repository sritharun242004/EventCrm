"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { categoryLabel } from "@/lib/format";
import { toast } from "@/components/ui/Toast";
import { createVendor } from "./actions";

const categories = [
  "sound_av", "stage", "decor", "carpet_flooring", "lighting", "fnb", "water",
  "catering", "contractor", "security", "ticketing", "photography", "videography",
  "transport", "printing", "logistics",
] as const;
type VendorCategoryValue = (typeof categories)[number];

export function VendorActions() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function submit(formData: FormData) {
    startSaving(async () => {
      const result = await createVendor({
        name: String(formData.get("name") ?? ""),
        category: String(formData.get("category") ?? "") as VendorCategoryValue,
        city: String(formData.get("city") ?? ""),
        contactName: String(formData.get("contactName") ?? ""),
        contactPhone: String(formData.get("contactPhone") ?? ""),
        rating: String(formData.get("rating") ?? "4.5"),
        reliabilityPct: String(formData.get("reliabilityPct") ?? "90"),
        preferred: formData.get("preferred") === "on",
        notes: String(formData.get("notes") ?? ""),
        sku: String(formData.get("sku") ?? ""),
        unit: String(formData.get("unit") ?? ""),
        basePriceInr: String(formData.get("basePriceInr") ?? "") || undefined,
        minOrder: String(formData.get("minOrder") ?? "1"),
        leadTimeDays: String(formData.get("leadTimeDays") ?? "7"),
      });
      if (!result.ok) {
        toast(result.error, "err");
        return;
      }
      toast(`${result.name} added to vendor directory`, "ok");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button className="btn" type="button" onClick={() => toast("CSV price-list import is not available yet", "err")}>Import price list</button>
      <button className="btn primary" type="button" aria-label="Open add vendor dialog" onClick={() => setOpen(true)}>Add vendor</button>

      {mounted ? createPortal(<>
        <button className={`dialog-scrim vendor-scrim ${open ? "open" : ""}`} type="button" onClick={() => setOpen(false)} aria-label="Close add vendor dialog" />
        <div className={`vendor-dialog ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="addVendorTitle" aria-describedby="addVendorDescription" aria-hidden={!open}>
        <div className="dialog-head">
          <div>
            <div className="vendor-dialog-kicker">Vendor directory</div>
            <h3 id="addVendorTitle">Add vendor</h3>
            <p id="addVendorDescription">Create a vendor profile and optionally add the first rate-card item.</p>
          </div>
          <button type="button" className="dialog-close" onClick={() => setOpen(false)} aria-label="Close dialog">×</button>
        </div>
        <form action={submit} key={open ? "open" : "closed"}>
          <div className="dialog-body vendor-form-body">
            <div className="field-row">
              <div className="field"><label htmlFor="vendor-name">Vendor name</label><input id="vendor-name" name="name" required autoFocus placeholder="e.g. Northstar Production" /></div>
              <div className="field"><label htmlFor="vendor-category">Category</label><select id="vendor-category" name="category" defaultValue="sound_av">{categories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></div>
            </div>
            <div className="field-row">
              <div className="field"><label htmlFor="vendor-city">City</label><input id="vendor-city" name="city" placeholder="Bengaluru" /></div>
              <div className="field"><label htmlFor="vendor-contact">Contact person</label><input id="vendor-contact" name="contactName" placeholder="Full name" /></div>
            </div>
            <div className="field-row">
              <div className="field"><label htmlFor="vendor-phone">Contact phone</label><input id="vendor-phone" name="contactPhone" type="tel" placeholder="+91 98765 43210" /></div>
              <div className="field vendor-check"><label><input name="preferred" type="checkbox" /> Preferred vendor</label></div>
            </div>
            <div className="field-row">
              <div className="field"><label htmlFor="vendor-rating">Rating</label><input id="vendor-rating" name="rating" type="number" min="0" max="5" step="0.1" defaultValue="4.5" required /></div>
              <div className="field"><label htmlFor="vendor-reliability">Reliability %</label><input id="vendor-reliability" name="reliabilityPct" type="number" min="0" max="100" defaultValue="90" required /></div>
            </div>
            <div className="field"><label htmlFor="vendor-notes">Notes</label><textarea id="vendor-notes" name="notes" rows={2} placeholder="Capabilities, payment terms, or operational notes" /></div>

            <div className="form-section-title">First rate-card item <span>Optional</span></div>
            <div className="field-row">
              <div className="field"><label htmlFor="vendor-sku">Service / SKU</label><input id="vendor-sku" name="sku" placeholder="Line-array PA system" /></div>
              <div className="field"><label htmlFor="vendor-unit">Unit</label><input id="vendor-unit" name="unit" placeholder="day / piece / person" /></div>
            </div>
            <div className="field-row field-row-3">
              <div className="field"><label htmlFor="vendor-price">Base price ₹</label><input id="vendor-price" name="basePriceInr" type="number" min="0" step="0.01" placeholder="45000" /></div>
              <div className="field"><label htmlFor="vendor-min-order">Minimum order</label><input id="vendor-min-order" name="minOrder" type="number" min="1" defaultValue="1" /></div>
              <div className="field"><label htmlFor="vendor-lead-time">Lead time days</label><input id="vendor-lead-time" name="leadTimeDays" type="number" min="0" defaultValue="7" /></div>
            </div>
          </div>
          <div className="dialog-foot">
            <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>{saving ? "Adding vendor…" : "Add vendor"}</button>
          </div>
        </form>
        </div>
      </>, document.body) : null}
    </>
  );
}
