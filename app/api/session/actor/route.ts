import { NextResponse } from "next/server";
import { ACTOR_COOKIE_NAME } from "@/lib/auth-constants";
import { getCurrentActorContext } from "@/lib/server/actor";
import { prisma } from "@/lib/server/db";

export async function POST(request: Request) {
  const { sessionPermissions, sessionUser } = await getCurrentActorContext();

  if (!sessionUser || !sessionPermissions.canManageTeam) {
    return NextResponse.json({ message: "当前账号没有代入切换权限" }, { status: 403 });
  }

  const body = await request.json();

  if (!body.actorId) {
    return NextResponse.json({ message: "缺少账号" }, { status: 400 });
  }

  const actor = await prisma.user.findUnique({
    where: { id: body.actorId },
    select: { id: true, name: true, active: true }
  });

  if (!actor?.active) {
    return NextResponse.json({ message: "账号不存在或已停用" }, { status: 404 });
  }

  const response = NextResponse.json({ actor });
  response.cookies.set(ACTOR_COOKIE_NAME, actor.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
