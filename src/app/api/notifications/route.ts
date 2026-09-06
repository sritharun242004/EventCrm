import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ notifications: [] }, { status: 401 });
  const notifications = await db.notification.findMany({
    where: { userId: me.id },
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    take: 30,
  });
  return NextResponse.json(
    {
      notifications: notifications.map((n) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        linkUrl: n.linkUrl,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
