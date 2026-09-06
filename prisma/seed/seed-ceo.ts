import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.SEED_ADMIN_NAME?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !name || !password) {
    throw new Error("SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, SEED_ADMIN_PASSWORD are required.");
  }
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");

  const passwordHash = await bcrypt.hash(password, 12);

  const ceo = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      role: "ceo",
      active: true,
      acceptedAt: new Date(),
    },
    update: {},
  });

  const eventsUpdated = await prisma.event.updateMany({
    where: { createdByUserId: null },
    data: { createdByUserId: ceo.id },
  });

  const rfqsUpdated = await prisma.rfq.updateMany({
    where: { createdByUserId: null },
    data: { createdByUserId: ceo.id },
  });

  console.log(`✔ CEO user id=${ceo.id} email=${ceo.email}`);
  console.log(`✔ Backfilled ${eventsUpdated.count} events, ${rfqsUpdated.count} rfqs`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
