import { AuditActionType, AuditEntityType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentActorContext } from "@/lib/server/actor";
import { prisma } from "@/lib/server/db";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { createAuditLog } from "@/lib/server/recompute";

export async function PATCH(request: Request) {
  const { sessionUser } = await getCurrentActorContext();

  if (!sessionUser) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ message: "请填写完整密码信息" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ message: "新密码至少 6 位" }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ message: "两次输入的新密码不一致" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      passwordHash: true
    }
  });

  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    return NextResponse.json({ message: "当前密码不正确" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      passwordHash: hashPassword(newPassword)
    }
  });

  await createAuditLog({
    actorId: sessionUser.id,
    entityType: AuditEntityType.USER,
    entityId: sessionUser.id,
    action: AuditActionType.UPDATED,
    fieldName: "passwordHash",
    note: "用户修改了自己的登录密码"
  });

  return NextResponse.json({ message: "密码更新成功" });
}
