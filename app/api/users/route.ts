import { UserTitle } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentActorContext } from "@/lib/server/actor";
import { deriveUserRoleFromTitle } from "@/lib/server/config";
import { prisma } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";

export async function GET() {
  const { permissions } = await getCurrentActorContext();
  if (!permissions.canManageTeam) {
    return NextResponse.json({ message: "当前岗位没有账号管理权限" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      title: true,
      active: true,
      managerId: true,
      manager: {
        select: {
          id: true,
          name: true,
          title: true
        }
      }
    },
    orderBy: [{ active: "desc" }, { title: "asc" }, { name: "asc" }]
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const { permissions } = await getCurrentActorContext();
  if (!permissions.canManageTeam) {
    return NextResponse.json({ message: "当前岗位没有账号管理权限" }, { status: 403 });
  }

  const body = await request.json();
  const title = body.title as UserTitle | undefined;
  const password = String(body.password ?? "").trim();

  if (!body.name || !title || !body.phone || !password) {
    return NextResponse.json({ message: "姓名、手机号、岗位和初始密码必填" }, { status: 400 });
  }

  if (body.email) {
    const duplicatedUser = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true }
    });

    if (duplicatedUser) {
      return NextResponse.json({ message: "该邮箱已存在" }, { status: 409 });
    }
  }

  const duplicatedPhone = await prisma.user.findFirst({
    where: { phone: body.phone },
    select: { id: true }
  });

  if (duplicatedPhone) {
    return NextResponse.json({ message: "该手机号已存在" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone,
      passwordHash: hashPassword(password),
      title,
      role: deriveUserRoleFromTitle(title),
      managerId: body.managerId || null,
      active: body.active ?? true
    }
  });

  return NextResponse.json(user);
}
