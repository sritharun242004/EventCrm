#!/usr/bin/env python3
"""Build one shareable HTML dashboard with styles, code and mock data embedded."""

from __future__ import annotations

import csv
import json
from datetime import date, datetime, time, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PREVIEW = ROOT / "ceo_dashboard_starter" / "dashboard_preview"
DATA = ROOT / "dashboard_mock_data"
OUTPUT = ROOT / "eventbot_ceo_dashboard_preview.html"


def load_tables():
    tables = {}
    for path in sorted(DATA.glob("[0-9][0-9]_*.csv")):
        with path.open(newline="", encoding="utf-8-sig") as handle:
            tables[path.name] = list(csv.DictReader(handle))
    events = tables.get("03_events_calendar.csv", [])
    today = date.today()
    demo = [
        (-3, "CEO Leadership Roundtable", "conference", "completed", "The Leela Ballroom", "09:30", "12:30", 45, 480000),
        (0, "NovaTech AI Studio Launch", "product_launch", "live", "KEC Convention Centre", "18:00", "22:30", 850, 2400000),
        (2, "Rao–Iyer Wedding Production Walkthrough", "wedding", "in_production", "Aravalli Fields", "11:00", "15:00", 1200, 1800000),
        (4, "Vendor Contract & RFQ Review", "corporate", "confirmed", "The Leela Ballroom", "10:00", "12:00", 28, 250000),
        (6, "Talent Strategy & Hiring Summit", "tech_summit", "confirmed", "Bangalore International Centre", "09:00", "17:30", 320, 950000),
        (9, "Skyline Live · Technical Rehearsal", "concert", "in_production", "Palace Grounds", "16:00", "23:00", 2500, 5600000),
        (12, "Family Business CEO Retreat", "private_party", "proposed", "Coastal Amphitheatre", "08:30", "20:00", 180, 1200000),
        (16, "Board Dinner & Sponsor Briefing", "gala", "lead", "The Leela Ballroom", "19:00", "22:00", 75, 680000),
    ]
    for index, (offset, name, kind, status, venue, start, end, attendees, budget) in enumerate(demo, 1):
        day = today + timedelta(days=offset)
        events.append({
            "event_id": f"DEMO-{index}", "event_code": f"CAL-DEMO-{index:02d}", "event_name": name,
            "event_type": kind, "status": status, "client": "CEO Network", "venue": venue, "city": "Bengaluru",
            "lead_team": "Executive Operations", "starts_on": day.isoformat(), "ends_on": day.isoformat(),
            "starts_at_ist": f"{day.isoformat()} {start}", "ends_at_ist": f"{day.isoformat()} {end}",
            "expected_attendees": str(attendees), "confirmed_attendees": str(round(attendees * .82)),
            "projected_revenue_inr": str(round(budget * 1.45)), "booked_revenue_inr": str(round(budget * 1.12)),
            "total_budget_inr": str(budget), "spent_inr": str(round(budget * .57)), "budget_used_pct": "57",
            "reputation_score": "", "highlight": "Mock calendar schedule for standalone preview",
        })
    tables["03_events_calendar.csv"] = events
    return tables


def main():
    html = (PREVIEW / "index.html").read_text(encoding="utf-8")
    css = (PREVIEW / "styles.css").read_text(encoding="utf-8")
    javascript = (PREVIEW / "app.js").read_text(encoding="utf-8")
    data = json.dumps(load_tables(), ensure_ascii=False).replace("</", "<\\/")

    html = html.replace('<link rel="stylesheet" href="styles.css">', f"<style>\n{css}\n</style>")
    html = html.replace('<script src="app.js"></script>', f"<script>window.STANDALONE=true;window.EMBEDDED_TABLES={data};</script>\n<script>\n{javascript}\n</script>")
    html = html.replace("Responsive CEO operations dashboard preview", "Standalone responsive CEO operations dashboard with embedded mock data")
    OUTPUT.write_text(html, encoding="utf-8")
    print(f"Created {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
