/**
 * Human labels for enum values coming out of Prisma.
 */
import type { EventStatus, EventType, RfqStatus, QuoteStatus, VendorCategory } from "@prisma/client";

export function statusLabel(s: EventStatus | string): string {
  const map: Record<string, string> = {
    lead: "Lead",
    proposed: "Proposed",
    confirmed: "Confirmed",
    in_production: "In Production",
    live: "Live",
    wrap_up: "Wrap-up",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[s] ?? String(s);
}

/** CSS class for status pills (semantic mapping). */
export function statusClass(s: EventStatus | string): string {
  return s === "in_production" ? "production" : String(s);
}

export function typeLabel(t: EventType | string): string {
  const map: Record<string, string> = {
    concert: "Concert",
    conference: "Conference",
    tech_summit: "Tech Summit",
    tedx: "TEDx",
    private_party: "Private Party",
    product_launch: "Product Launch",
    wedding: "Wedding",
    festival: "Festival",
    corporate: "Corporate",
    gala: "Gala",
  };
  return map[t] ?? String(t);
}

export function categoryLabel(c: VendorCategory | string): string {
  const map: Record<string, string> = {
    sound_av: "Sound & AV",
    stage: "Stage",
    decor: "Decor",
    carpet_flooring: "Carpet & Floor",
    lighting: "Lighting",
    fnb: "F&B",
    water: "Water",
    catering: "Catering",
    contractor: "Contractors",
    security: "Security",
    ticketing: "Ticketing",
    photography: "Photography",
    videography: "Videography",
    transport: "Transport",
    printing: "Printing",
    logistics: "Logistics",
  };
  return map[c] ?? String(c);
}

export function rfqStatusLabel(s: RfqStatus | string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    collecting: "Collecting",
    comparing: "Comparing",
    awarded: "Awarded",
    cancelled: "Cancelled",
  };
  return map[s] ?? String(s);
}

export function quoteStatusLabel(s: QuoteStatus | string): string {
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}
