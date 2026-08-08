"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createTeamMember, reassignTeamMember } from "./actions";
import { toast } from "@/components/ui/Toast";

type Team = { id: number; name: string };
type Member = { id: number; name: string; teamId: number | null; teamName: string | null };

/**
 * Header actions for /teams: "Reassign" and "Add member" open drawer dialogs
 * that call the corresponding server action.
 */
export function TeamActions({ teams, members }: { teams: Team[]; members: Member[] }) {
  const [open, setOpen] = useState<"add" | "reassign" | null>(null);
  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => setOpen("reassign")}
        aria-label="Open reassign member dialog"
      >
        Reassign
      </button>
      <button
        type="button"
        className="btn primary"
        onClick={() => setOpen("add")}
        aria-label="Open add member dialog"
      >
        Add member
      </button>

      {open === "add" && (
        <AddMemberDrawer teams={teams} onClose={() => setOpen(null)} />
      )}
      {open === "reassign" && (
        <ReassignDrawer teams={teams} members={members} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function DrawerShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLInputElement>("input, select")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  if (!mounted) return null;
  return createPortal(
    <>
      <button className="dialog-scrim vendor-scrim open" type="button" onClick={onClose} aria-label={`Close ${title}`} />
      <div ref={ref} className="vendor-dialog open" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-head">
          <div>
            <div className="vendor-dialog-kicker">Team management</div>
            <h3>{title}</h3>
            <p>{title === "Add team member" ? "Create a team profile with role, skills, utilization and performance rating." : "Move an existing team member to a different operating team."}</p>
          </div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label={`Close ${title}`}>×</button>
        </div>
        {children}
      </div>
    </>, document.body
  );
}

function AddMemberDrawer({ teams, onClose }: { teams: Team[]; onClose: () => void }) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();

  function submit(form: FormData) {
    startSaving(async () => {
      const res = await createTeamMember({
        name: String(form.get("name") ?? ""),
        role: String(form.get("role") ?? ""),
        teamId: Number(form.get("teamId") ?? 0),
        utilizationPct: Number(form.get("utilizationPct") ?? 70),
        rating: Number(form.get("rating") ?? 4.5),
        skills: String(form.get("skills") ?? ""),
      });
      if (res.ok) {
        toast(`${res.name} added to the team`, "ok");
        onClose();
        router.refresh();
      } else {
        toast(res.error, "err");
      }
    });
  }

  return (
    <DrawerShell title="Add team member" onClose={onClose}>
      <form action={submit}>
        <div className="dialog-body vendor-form-body">
        <div className="field">
          <label htmlFor="tm-name">Name *</label>
          <input id="tm-name" name="name" required autoFocus placeholder="e.g. Priya Menon" />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="tm-role">Role</label>
            <input id="tm-role" name="role" placeholder="Producer" />
          </div>
          <div className="field">
            <label htmlFor="tm-team">Team *</label>
            <select id="tm-team" name="teamId" required defaultValue="">
              <option value="" disabled>Select a team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="tm-util">Utilization %</label>
            <input id="tm-util" name="utilizationPct" type="number" min={0} max={100} defaultValue={70} />
          </div>
          <div className="field">
            <label htmlFor="tm-rating">Rating (0–5)</label>
            <input id="tm-rating" name="rating" type="number" min={0} max={5} step={0.1} defaultValue={4.5} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="tm-skills">Skills (comma-separated)</label>
          <input id="tm-skills" name="skills" placeholder="production, audio, stage" />
        </div>
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Saving…" : "Add member"}
          </button>
        </div>
      </form>
    </DrawerShell>
  );
}

function ReassignDrawer({
  teams,
  members,
  onClose,
}: {
  teams: Team[];
  members: Member[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();

  function submit(form: FormData) {
    startSaving(async () => {
      const res = await reassignTeamMember({
        memberId: Number(form.get("memberId") ?? 0),
        teamId: Number(form.get("teamId") ?? 0),
      });
      if (res.ok) {
        toast("Member reassigned", "ok");
        onClose();
        router.refresh();
      } else {
        toast(res.error, "err");
      }
    });
  }

  return (
    <DrawerShell title="Reassign member" onClose={onClose}>
      <form action={submit}>
        <div className="dialog-body vendor-form-body">
        <div className="field">
          <label htmlFor="rs-member">Member *</label>
          <select id="rs-member" name="memberId" required defaultValue="" autoFocus>
            <option value="" disabled>Select a member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — currently on {m.teamName ?? "no team"}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rs-team">Move to team *</label>
          <select id="rs-team" name="teamId" required defaultValue="">
            <option value="" disabled>Select a team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Saving…" : "Reassign"}
          </button>
        </div>
      </form>
    </DrawerShell>
  );
}
