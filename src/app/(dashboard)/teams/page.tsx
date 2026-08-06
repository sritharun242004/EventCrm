import { db } from "@/lib/db";
import { PageHead } from "@/components/ui/PageHead";
import { Meter } from "@/components/ui/Meter";
import { Pill } from "@/components/ui/Pill";
import { TeamActions } from "./TeamActions";

export const revalidate = 60;

export default async function TeamsPage() {
  const [teams, members, events] = await Promise.all([
    db.team.findMany({ include: { members: true } }),
    db.teamMember.findMany({ include: { team: true } }),
    db.event.findMany({ include: { leadTeam: true } }),
  ]);

  const actionTeams = teams.map((t) => ({ id: t.id, name: t.name }));
  const actionMembers = members.map((m) => ({
    id: m.id,
    name: m.name,
    teamId: m.teamId,
    teamName: m.team?.name ?? null,
  }));

  return (
    <>
      <PageHead
        crumb="Team management"
        title="Teams"
        subtitle={`${teams.length} teams · ${members.length} people. Utilization, ratings, and current focus.`}
        actions={<TeamActions teams={actionTeams} members={actionMembers} />}
      />

      <div className="row row-3" style={{ marginBottom: 16 }}>
        {teams.map((t) => {
          const people = t.members;
          const avgUtil = people.length ? Math.round(people.reduce((a, m) => a + m.utilizationPct, 0) / people.length) : 0;
          const active = events.filter(
            (e) => e.leadTeamId === t.id && ["live", "in_production", "confirmed"].includes(e.status),
          ).length;
          const avgRating = people.length
            ? (people.reduce((a, m) => a + Number(m.ratingAvg), 0) / people.length).toFixed(1)
            : "—";
          return (
            <div className="team-card" key={t.id}>
              <div className="flex between">
                <h4>{t.name}</h4>
                <Pill kind="completed">{avgRating}★</Pill>
              </div>
              <div className="focus">{t.focus} · lead {t.leadName}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <div className="subtle">Utilization</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{avgUtil}%</div>
                  <Meter value={avgUtil} kind={avgUtil > 85 ? "warn" : undefined} style={{ marginTop: 4 }} />
                </div>
                <div>
                  <div className="subtle">Active events</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{active}</div>
                  <div className="subtle" style={{ marginTop: 4 }}>{people.length} members</div>
                </div>
              </div>
              <div className="team-people">
                {people.map((p) => (
                  <span key={p.id} className="chiplet" title={`${p.role} · ${p.utilizationPct}% util · ${Number(p.ratingAvg).toFixed(1)}★`}>
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>All producers · load</h3>
          <span className="sub">Sorted by current utilization</span>
        </div>
        <div className="table-wrap" style={{ border: 0 }}>
          <table>
            <thead>
              <tr><th>Producer</th><th>Team</th><th>Role</th><th className="num">Utilization</th><th className="num">Rating</th></tr>
            </thead>
            <tbody>
              {[...members].sort((a, b) => b.utilizationPct - a.utilizationPct).map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="flex" style={{ gap: 10 }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                        {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </div>
                      <b>{m.name}</b>
                    </div>
                  </td>
                  <td className="muted">{m.team?.name ?? "—"}</td>
                  <td className="muted">{m.role}</td>
                  <td className="num" style={{ minWidth: 180 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Meter value={m.utilizationPct} kind={m.utilizationPct > 90 ? "warn" : m.utilizationPct > 75 ? undefined : "info"} style={{ width: 120, height: 5 }} />
                      <b>{m.utilizationPct}%</b>
                    </div>
                  </td>
                  <td className="num"><span className="stars">★</span> <b>{Number(m.ratingAvg).toFixed(1)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
