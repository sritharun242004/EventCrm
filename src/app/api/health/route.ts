import { NextResponse } from "next/server";

// Report which runtime env vars the SSR compute sees. Values redacted;
// only keys and length. Safe to make public — helps diagnose config drift.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const keys = [
    "DATABASE_URL",
    "DIRECT_URL",
    "AUTH_EMAIL",
    "AUTH_PASSWORD",
    "AUTH_SECRET",
    "NODE_ENV",
    "AWS_REGION",
  ];
  const seen: Record<string, string> = {};
  for (const k of keys) {
    const v = process.env[k];
    seen[k] = v ? `set (len=${v.length})` : "MISSING";
  }
  return NextResponse.json({
    ok: true,
    node: process.version,
    cwd: process.cwd(),
    env: seen,
    time: new Date().toISOString(),
  });
}
