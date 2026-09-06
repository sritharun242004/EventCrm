import { PrismaClient, type UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const DEMO_PASSWORD = "Password2026!";

const users: Array<{ email: string; name: string; role: UserRole }> = [
  { email: "sales@eventbot.local",       name: "Sales Demo",       role: "sales" },
  { email: "producer@eventbot.local",    name: "Producer Demo",    role: "producer" },
  { email: "coordinator@eventbot.local", name: "Coordinator Demo", role: "coordinator" },
  { email: "finance@eventbot.local",     name: "Finance Demo",     role: "finance" },
];

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  for (const u of users) {
    const row = await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        active: true,
        passwordHash: hash,
        acceptedAt: new Date(),
      },
      // Refresh the hash on re-run so the shared password always works.
      update: { passwordHash: hash, active: true, name: u.name, role: u.role, acceptedAt: new Date() },
    });
    console.log(`✔ ${row.role.padEnd(11)}  id=${String(row.id).padStart(2)}  ${row.email}`);
  }
  console.log(`\nAll demo users share the password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
