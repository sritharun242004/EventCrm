import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { acceptProposal } from "./actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function PublicProposalPage({ params }: Props) {
  const { token } = await params;

  const proposal = await db.proposal.findUnique({
    where: { publicToken: token },
    include: {
      event: { select: { name: true, startsOn: true, endsOn: true, venue: { select: { name: true, city: true } } } },
    },
  });
  if (!proposal) notFound();

  // Record first view (side-effect on GET is deliberate — this is a public
  // one-off view, and the model has a firstViewedAt column for it).
  if (proposal.status === "sent" && !proposal.firstViewedAt) {
    await db.proposal.update({
      where: { id: proposal.id },
      data: { status: "viewed", firstViewedAt: new Date() },
    });
  }

  const canAccept = proposal.status === "sent" || proposal.status === "viewed";
  const amount = proposal.amountCents != null ? Number(proposal.amountCents) / 100 : null;

  return (
    <div className="mx-auto max-w-3xl p-8 md:p-16">
      <header className="mb-8 border-b pb-6">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
          Proposal v{proposal.version} · Eventbot
        </div>
        <h1 className="text-3xl font-semibold">{proposal.title}</h1>
        <div className="text-sm text-slate-600 mt-3">
          For <b>{proposal.event.name}</b>
          {proposal.event.venue?.name && <> · {proposal.event.venue.name}{proposal.event.venue.city && `, ${proposal.event.venue.city}`}</>}
          {" · "}
          {new Date(proposal.event.startsOn).toLocaleDateString()}
          {new Date(proposal.event.endsOn).getTime() !== new Date(proposal.event.startsOn).getTime() && (
            <> → {new Date(proposal.event.endsOn).toLocaleDateString()}</>
          )}
        </div>
      </header>

      <article className="prose prose-slate max-w-none whitespace-pre-wrap text-sm leading-relaxed">
        {proposal.bodyMarkdown}
      </article>

      {amount != null && (
        <div className="mt-8 rounded-lg border border-slate-200 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Estimated total</div>
          <div className="text-2xl font-semibold mt-1">₹{amount.toLocaleString("en-IN")}</div>
        </div>
      )}

      <div className="mt-10 flex items-center gap-3">
        {canAccept ? (
          <form action={acceptProposal}>
            <input type="hidden" name="token" value={token} />
            <button className="rounded bg-slate-900 text-white px-5 py-2 text-sm">Accept proposal</button>
          </form>
        ) : proposal.status === "accepted" ? (
          <div className="text-sm text-green-700">
            Accepted on {proposal.acceptedAt ? new Date(proposal.acceptedAt).toLocaleDateString() : ""}. Thank you.
          </div>
        ) : (
          <div className="text-sm text-slate-500 italic">
            This proposal is not currently open for acceptance ({proposal.status}).
          </div>
        )}
      </div>
      <footer className="mt-16 text-xs text-slate-400 text-center">
        Powered by Eventbot
      </footer>
    </div>
  );
}
