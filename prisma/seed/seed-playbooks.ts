import { PrismaClient, type EventType, type PlaybookTrigger, type TaskPriority, type UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

type Item = {
  title: string;
  description?: string;
  priority?: TaskPriority;
  role?: UserRole;
  offsetDays: number;
};

type Playbook = {
  name: string;
  trigger: PlaybookTrigger;
  eventType: EventType | null;
  items: Item[];
};

const PLAYBOOKS: Playbook[] = [
  {
    name: "Concert — production kickoff",
    trigger: "event_confirmed",
    eventType: "concert",
    items: [
      { title: "Send artist rider to vendor manager", role: "producer", offsetDays: -45, priority: "high" },
      { title: "Book sound + stage vendors", role: "producer", offsetDays: -40, priority: "high" },
      { title: "Lock venue insurance certificates", role: "coordinator", offsetDays: -35 },
      { title: "Ticket tier + pricing lock", role: "sales", offsetDays: -30, priority: "high" },
      { title: "Marketing collateral brief", role: "sales", offsetDays: -30 },
      { title: "Confirm accommodation for crew", role: "coordinator", offsetDays: -21 },
      { title: "Backline check with artist team", role: "producer", offsetDays: -14, priority: "high" },
      { title: "Run-of-show doc v1", role: "coordinator", offsetDays: -10 },
      { title: "Rehearsal + tech-check", role: "producer", offsetDays: -2, priority: "urgent" },
    ],
  },
  {
    name: "Wedding — production kickoff",
    trigger: "event_confirmed",
    eventType: "wedding",
    items: [
      { title: "Client kickoff call + brief sign-off", role: "sales", offsetDays: -60, priority: "high" },
      { title: "Venue + florist site visit", role: "producer", offsetDays: -45 },
      { title: "F&B menu tasting", role: "coordinator", offsetDays: -40 },
      { title: "Decor + lighting brief", role: "producer", offsetDays: -35 },
      { title: "Guest list + RSVP tracker up", role: "coordinator", offsetDays: -30 },
      { title: "Rehearsal dinner logistics", role: "coordinator", offsetDays: -14 },
      { title: "Final vendor payments cleared", role: "finance", offsetDays: -7, priority: "high" },
      { title: "Day-of run sheet + timeline", role: "producer", offsetDays: -3, priority: "urgent" },
    ],
  },
  {
    name: "Conference — in-production checklist",
    trigger: "event_in_production",
    eventType: "conference",
    items: [
      { title: "Speaker travel confirmations", role: "coordinator", offsetDays: -21, priority: "high" },
      { title: "Session AV needs + slide collection", role: "producer", offsetDays: -14 },
      { title: "Attendee comms — reminder #1", role: "sales", offsetDays: -10 },
      { title: "Badge printing + on-site check-in staffing", role: "coordinator", offsetDays: -5, priority: "high" },
      { title: "Sponsor deliverables sign-off", role: "sales", offsetDays: -5 },
      { title: "Green room stocking + host briefing", role: "coordinator", offsetDays: -2, priority: "urgent" },
      { title: "Livestream + capture handoff", role: "producer", offsetDays: -1, priority: "urgent" },
    ],
  },
];

async function main() {
  for (const pb of PLAYBOOKS) {
    // Upsert by name (unique in practice for seed set).
    const existing = await prisma.taskPlaybook.findFirst({ where: { name: pb.name } });
    if (existing) {
      console.log(`~ ${pb.name} already exists (id=${existing.id}) — skipping`);
      continue;
    }
    const created = await prisma.taskPlaybook.create({
      data: {
        name: pb.name,
        trigger: pb.trigger,
        eventType: pb.eventType,
        active: true,
        items: {
          create: pb.items.map((it, idx) => ({
            title: it.title,
            description: it.description,
            priority: it.priority ?? "normal",
            defaultAssigneeRole: it.role,
            offsetDaysFromEvent: it.offsetDays,
            orderIdx: idx,
          })),
        },
      },
    });
    console.log(`+ ${pb.name} (id=${created.id}, ${pb.items.length} items)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
