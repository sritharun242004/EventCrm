import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const keys = ["DATABASE_URL", "DIRECT_URL", "AUTH_EMAIL", "AUTH_PASSWORD", "AUTH_SECRET", "NODE_ENV", "AWS_REGION"];
  const env: Record<string, string> = {};
  for (const k of keys) {
    const v = process.env[k];
    env[k] = v ? `set (len=${v.length})` : "MISSING";
  }

  let dbCheck: unknown;
  try {
    // Simplest possible Prisma round trip — proves the client + adapter + Neon TCP path all work.
    const t0 = Date.now();
    const count = await db.event.count();
    dbCheck = { ok: true, events: count, ms: Date.now() - t0 };
  } catch (err) {
    dbCheck = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5) : undefined,
    };
  }

  return NextResponse.json({
    ok: (dbCheck as any).ok === true,
    node: process.version,
    cwd: process.cwd(),
    env,
    db: dbCheck,
    time: new Date().toISOString(),
  });
}
