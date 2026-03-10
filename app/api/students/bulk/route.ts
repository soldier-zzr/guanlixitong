import { StudentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { deriveStageFromStudentStatus, recalculateCohortStats } from "@/lib/server/recompute";

export async function PATCH(request: Request) {
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
      cohortId: true
    }
  });

  const normalizedCohortId = body.cohortId === "" ? null : body.cohortId;
  const normalizedSalesOwnerId = body.salesOwnerId === "" ? null : body.salesOwnerId;
  const normalizedDeliveryOwnerId = body.deliveryOwnerId === "" ? null : body.deliveryOwnerId;
  const nextStatus = body.status as StudentStatus | undefined;

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

  return NextResponse.json({ updatedCount: students.length });
}
