import { NextResponse } from "next/server";
import { ACTOR_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { prisma } from "@/lib/server/db";
import { verifyPassword } from "@/lib/server/password";

export async function POST(request: Request) {
  const body = await request.json();
  const login = String(body.login ?? "").trim();
  const password = String(body.password ?? "");

  if (!login || !password) {
    return NextResponse.json({ message: "请输入手机号和密码" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      active: true,
      OR: [{ phone: login }, { email: login }]
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      passwordHash: true,
      active: true
    }
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ message: "账号或密码错误" }, { status: 401 });
  }

  const response = NextResponse.json({
    user: {
      id: user.id,
      name: user.name
    }
  });
  response.cookies.set(SESSION_COOKIE_NAME, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  response.cookies.set(ACTOR_COOKIE_NAME, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
