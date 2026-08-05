import Link from "next/link";
import { db } from "@/lib/db";
import { PageHead } from "@/components/ui/PageHead";
import { NewEventForm } from "./NewEventForm";

export const dynamic = "force-dynamic";

type Search = Promise<{ date?: string }>;

export default async function NewEventPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const initialDate =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? sp.date
      : new Date().toISOString().slice(0, 10);

  const [venues, clients] = await Promise.all([
    db.venue.findMany({ orderBy: { name: "asc" } }),
    db.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  const dateLabel = new Date(initialDate).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <PageHead
        crumb={<><Link href="/calendar" style={{ color: "var(--primary)", fontWeight: 700 }}>← Calendar</Link>{" · New event"}</>}
        title={dateLabel}
        subtitle="Schedule a new programme. Fields marked with an asterisk are required."
        actions={<Link className="btn" href="/calendar">Cancel</Link>}
      />
      <NewEventForm
        initialDate={initialDate}
        venues={venues.map((v) => ({ id: v.id, name: v.name, city: v.city }))}
        clients={clients.map((c) => ({ id: c.id, name: c.name, company: c.company }))}
      />
    </>
  );
}
