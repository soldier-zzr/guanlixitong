import { StudentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentActorContext } from "@/lib/server/actor";
import { protectedRefundStatuses, studentManualEditableStatuses } from "@/lib/server/config";
import { prisma } from "@/lib/server/db";
import {
  createAuditLog,
  deriveStageFromStudentStatus,
  recalculateCohortStats,
} from "@/lib/server/recompute";
import { AuditActionType, AuditEntityType } from "@prisma/client";

export async function PATCH(request: Request) {
  const { actor, permissions } = await getCurrentActorContext();
  if (!permissions.canEditStudentSales) {
    return NextResponse.json({ message: "当前岗位没有批量修改学员权限" }, { status: 403 });
  }

  const body = await request.json();
  const studentIds = Array.isArray(body.studentIds) ? body.studentIds.filter(Boolean) : [];

  if (studentIds.length === 0) {
    return NextResponse.json({ message: "请选择需要批量修改的学员" }, { status: 400 });
  }

  const students = await prisma.student.findMany({
    where: {
      id: {
        in: studentIds
      }
    },
    select: {
      id: true,
      cohortId: true,
      status: true
    }
  });

  const normalizedCohortId = body.cohortId === "" ? null : body.cohortId;
  const normalizedSalesOwnerId = body.salesOwnerId === "" ? null : body.salesOwnerId;
  const normalizedDeliveryOwnerId = body.deliveryOwnerId === "" ? null : body.deliveryOwnerId;
  const nextStatus = body.status as StudentStatus | undefined;

  if (nextStatus && !studentManualEditableStatuses.includes(nextStatus)) {
    return NextResponse.json(
      { message: "退款流程状态只能通过退款工作台推进，不能批量修改" },
      { status: 400 }
    );
  }

  if (
    nextStatus &&
    students.some((student) => protectedRefundStatuses.includes(student.status))
  ) {
    return NextResponse.json(
      { message: "所选学员中包含退款流程中的记录，请到退款工作台处理" },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    students.map((student) =>
      prisma.student.update({
        where: { id: student.id },
        data: {
          status: nextStatus ?? undefined,
          currentStage: nextStatus ? deriveStageFromStudentStatus(nextStatus) : undefined,
          cohortId: body.cohortId !== undefined ? normalizedCohortId : undefined,
          salesOwnerId: body.salesOwnerId !== undefined ? normalizedSalesOwnerId : undefined,
          deliveryOwnerId: body.deliveryOwnerId !== undefined ? normalizedDeliveryOwnerId : undefined
        }
      })
    )
  );

  const affectedCohortIds = new Set<string>();
  for (const student of students) {
    if (student.cohortId) {
      affectedCohortIds.add(student.cohortId);
    }
  }
  if (normalizedCohortId) {
    affectedCohortIds.add(normalizedCohortId);
  }

  for (const cohortId of affectedCohortIds) {
    await recalculateCohortStats(cohortId);
  }

  for (const student of students) {
    await createAuditLog({
      actorId: actor?.id ?? null,
      entityType: AuditEntityType.STUDENT,
      entityId: student.id,
      action: nextStatus ? AuditActionType.STATUS_CHANGED : AuditActionType.UPDATED,
      note: "批量修改学员主档",
      metaJson: JSON.stringify({
        status: nextStatus ?? null,
        cohortId: normalizedCohortId,
        salesOwnerId: normalizedSalesOwnerId,
        deliveryOwnerId: normalizedDeliveryOwnerId
      })
    });
  }

  return NextResponse.json({ updatedCount: students.length });
}
