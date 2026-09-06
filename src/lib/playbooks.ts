import "server-only";
import { db } from "@/lib/db";
import type { EventStatus, PlaybookTrigger, UserRole } from "@prisma/client";
import { notify } from "@/lib/comments";
import { logActivity } from "@/lib/activity";

const STATUS_TO_TRIGGER: Partial<Record<EventStatus, PlaybookTrigger>> = {
  confirmed: "event_confirmed",
  in_production: "event_in_production",
};

/**
 * Fires when an event's status transitions. Idempotent per (event, playbook)
 * pair via the event_playbook_runs UNIQUE constraint — so re-firing the same
 * trigger never duplicates tasks.
 */
export async function runPlaybooksForStatus(input: {
  eventId: number;
  newStatus: EventStatus;
  actorUserId: number | null;
}): Promise<{ ran: number; tasksCreated: number }> {
  const trigger = STATUS_TO_TRIGGER[input.newStatus];
  if (!trigger) return { ran: 0, tasksCreated: 0 };

  const evt = await db.event.findUnique({
    where: { id: input.eventId },
    select: { id: true, type: true, startsOn: true, code: true, name: true },
  });
  if (!evt) return { ran: 0, tasksCreated: 0 };

  const playbooks = await db.taskPlaybook.findMany({
    where: {
      active: true,
      trigger,
      OR: [{ eventType: null }, { eventType: evt.type }],
    },
    include: { items: { orderBy: { orderIdx: "asc" } } },
  });

  let ran = 0;
  let tasksCreated = 0;
  const startMs = evt.startsOn.getTime();

  for (const pb of playbooks) {
    // Skip if already run for this event.
    const already = await db.eventPlaybookRun.findUnique({
      where: { eventId_playbookId: { eventId: evt.id, playbookId: pb.id } },
    });
    if (already) continue;

    // Resolve default assignees once per role required by this playbook.
    const rolesNeeded = [
      ...new Set(pb.items.map((i) => i.defaultAssigneeRole).filter((r): r is UserRole => Boolean(r))),
    ];
    const usersByRole: Partial<Record<UserRole, { id: number; name: string }>> = {};
    for (const role of rolesNeeded) {
      const u = await db.user.findFirst({
        where: { role, active: true },
        orderBy: { id: "asc" },
        select: { id: true, name: true },
      });
      if (u) usersByRole[role] = u;
    }

    await db.$transaction(async (tx) => {
      const run = await tx.eventPlaybookRun.create({
        data: { eventId: evt.id, playbookId: pb.id },
      });
      for (const item of pb.items) {
        const assignee = item.defaultAssigneeRole
          ? usersByRole[item.defaultAssigneeRole]?.id ?? null
          : null;
        const dueOn = new Date(startMs + item.offsetDaysFromEvent * 86_400_000);
        const created = await tx.task.create({
          data: {
            eventId: evt.id,
            title: item.title,
            description: item.description,
            priority: item.priority,
            assigneeUserId: assignee,
            createdByUserId: input.actorUserId ?? 1,
            dueOn,
          },
        });
        tasksCreated += 1;
        // fan out a notification to the assignee (skip null).
        if (assignee && assignee !== input.actorUserId) {
          await tx.notification.create({
            data: {
              userId: assignee,
              kind: "task_assigned",
              title: `New task on ${evt.name}`,
              body: `${item.title} · via playbook '${pb.name}'`,
              linkUrl: evt.code ? `/events/${evt.code}` : "/tasks",
            },
          });
        }
      }
      return run;
    });

    await logActivity({
      actorUserId: input.actorUserId,
      action: "playbook.run",
      entityType: "event",
      entityId: evt.id,
      diff: { playbookId: pb.id, playbookName: pb.name, itemsCreated: pb.items.length },
    });
    ran += 1;
  }

  return { ran, tasksCreated };
}
