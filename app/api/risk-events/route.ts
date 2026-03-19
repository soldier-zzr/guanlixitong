import { EnrollmentStage } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentActorContext } from "@/lib/server/actor";
import { riskSignalCatalog } from "@/lib/server/config";
import { prisma } from "@/lib/server/db";
import { recalculateCohortStats, refreshStudentRisk } from "@/lib/server/recompute";

export async function POST(request: Request) {
  const { actor, permissions } = await getCurrentActorContext();
  if (!permissions.canCreateRiskEvents) {
    return NextResponse.json({ message: "当前岗位没有新增风险事件权限" }, { status: 403 });
  }

  const body = await request.json();
  const signal = riskSignalCatalog.find((item) => item.code === body.signalCode);

  if (!body.studentId || !signal) {
    return NextResponse.json({ message: "风险事件参数不完整" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { id: body.studentId },
    select: { cohortId: true }
  });

  const riskEvent = await prisma.riskEvent.create({
    data: {
      studentId: body.studentId,
      enrollmentId: body.enrollmentId || null,
      signalCode: signal.code,
      signalLabel: signal.label,
      stage: (body.stage as EnrollmentStage) ?? EnrollmentStage.PRE_START,
      severityScore: signal.severity,
      note: body.note || null,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
      reporterId: actor?.id || null
    }
  });

  await refreshStudentRisk(body.studentId);

  if (student?.cohortId) {
    await recalculateCohortStats(student.cohortId);
  }

  return NextResponse.json(riskEvent);
}
