import Link from "next/link";
import { db } from "@/lib/db";
import { moneyShort } from "@/lib/money";
import { categoryLabel } from "@/lib/format";
import { PageHead } from "@/components/ui/PageHead";
import { Meter } from "@/components/ui/Meter";
import type { VendorCategory } from "@prisma/client";
import { VendorActions } from "./VendorActions";

// Vendor directory changes infrequently — cache the render for 60s.
export const revalidate = 60;

type Search = Promise<{ cat?: string }>;

export default async function VendorsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const filter = sp.cat;

  const [vendors, offerings] = await Promise.all([
    db.vendor.findMany({
      where: filter ? { category: filter as VendorCategory } : undefined,
      orderBy: [{ preferred: "desc" }, { name: "asc" }],
    }),
    db.vendorOffering.findMany(),
  ]);
  const allCategories = await db.vendor.groupBy({
    by: ["category"],
    _count: { _all: true },
  });
  const totalCount = allCategories.reduce((a, c) => a + c._count._all, 0);

  // A representative "sample rate" per vendor: first offering, formatted.
  const sampleRateFor = (vendorId: number) => {
    const o = offerings.find((x) => x.vendorId === vendorId);
    if (!o) return "—";
    return `${o.sku} — ${moneyShort(o.basePriceCents)}/${o.unit}`;
  };

  return (
    <>
      <PageHead
        crumb="Vendor Directory"
        title="Vendors & Pricing"
        subtitle={`Rate cards, ratings, reliability — ${totalCount} vendors across ${allCategories.length} categories.`}
        actions={<VendorActions />}
      />

      <div className="rail">
        <div className="rail-list">
          <Link href="/vendors" className={"rail-item " + (!filter ? "on" : "")}>
            <span>All</span>
            <span className="n">{totalCount}</span>
          </Link>
          {allCategories.map((c) => (
            <Link
              key={c.category}
              href={`/vendors?cat=${c.category}`}
              className={"rail-item " + (filter === c.category ? "on" : "")}
            >
              <span>{categoryLabel(c.category)}</span>
              <span className="n">{c._count._all}</span>
            </Link>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Vendor</th>
                <th>Category</th>
                <th>City</th>
                <th className="num">Rating</th>
                <th className="num">Reliability</th>
                <th>Sample rate</th>
                <th className="num">Action</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="stack">
                      <b>
                        {v.name}
                        {v.preferred ? <span className="pill completed" style={{ marginLeft: 6 }}>Preferred</span> : null}
                      </b>
                      <span className="subtle">Contact ready · quote in 24h</span>
                    </div>
                  </td>
                  <td className="muted">{categoryLabel(v.category)}</td>
                  <td className="muted">{v.city ?? "—"}</td>
                  <td className="num">
                    <span className="stars">★</span> <b>{Number(v.rating).toFixed(1)}</b>
                  </td>
                  <td className="num">
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Meter
                        value={v.reliabilityPct}
                        kind={v.reliabilityPct >= 95 ? "success" : v.reliabilityPct >= 90 ? undefined : "warn"}
                        style={{ width: 60, height: 5 }}
                      />
                      <b>{v.reliabilityPct}%</b>
                    </div>
                  </td>
                  <td className="muted">{sampleRateFor(v.id)}</td>
                  <td className="num">
                    <button className="btn ghost" style={{ padding: "4px 8px", fontSize: 12 }}>Quote</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
