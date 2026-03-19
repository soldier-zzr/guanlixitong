import { UserTitle } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentActorContext } from "@/lib/server/actor";
import { deriveUserRoleFromTitle } from "@/lib/server/config";
import { prisma } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { permissions } = await getCurrentActorContext();
  if (!permissions.canManageTeam) {
    return NextResponse.json({ message: "当前岗位没有账号管理权限" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const title = body.title as UserTitle | undefined;
  const password = typeof body.password === "string" ? body.password.trim() : "";

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true }
  });

  if (!user) {
    return NextResponse.json({ message: "账号不存在" }, { status: 404 });
  }

  if (body.email && body.email !== user.email) {
    const duplicatedUser = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true }
    });

    if (duplicatedUser) {
      return NextResponse.json({ message: "该邮箱已存在" }, { status: 409 });
    }
  }

  if (body.phone && body.phone !== "" ) {
    const duplicatedPhone = await prisma.user.findFirst({
      where: {
        phone: body.phone,
        id: { not: id }
      },
      select: { id: true }
    });

    if (duplicatedPhone) {
      return NextResponse.json({ message: "该手机号已存在" }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      email: body.email === "" ? null : body.email ?? undefined,
      phone: body.phone === "" ? null : body.phone ?? undefined,
      passwordHash: password ? hashPassword(password) : undefined,
      title: title ?? undefined,
      role: title ? deriveUserRoleFromTitle(title) : undefined,
      managerId: body.managerId === "" ? null : body.managerId ?? undefined,
      active: typeof body.active === "boolean" ? body.active : undefined
    }
  });

  return NextResponse.json(updated);
}
