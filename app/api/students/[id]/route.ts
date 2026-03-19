import { AuditActionType, AuditEntityType, PaymentStatus, RefundStatus, StudentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentActorContext } from "@/lib/server/actor";
import { protectedRefundStatuses, studentManualEditableStatuses } from "@/lib/server/config";
import { ensureDatabaseReady, prisma } from "@/lib/server/db";
import { getStudentDetail } from "@/lib/server/queries";
import {
  createAuditLog,
  deriveStageFromEnrollment,
  deriveStageFromStudentStatus,
  recalculateCohortStats
  ,
  upsertRevenueLedgerEntriesForEnrollment
} from "@/lib/server/recompute";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDatabaseReady();
  const { id } = await context.params;
  const student = await getStudentDetail(id);

  if (!student) {
    return NextResponse.json({ message: "学员不存在" }, { status: 404 });
  }

  return NextResponse.json(student);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDatabaseReady();
  const { actor, permissions } = await getCurrentActorContext();
  if (
    !permissions.canEditStudentSales &&
    !permissions.canEditStudentDelivery &&
    !permissions.canCreateRiskEvents
  ) {
    return NextResponse.json({ message: "当前岗位没有修改学员权限" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const nextStatus = body.status as StudentStatus | undefined;
  const normalizedCohortId = body.cohortId === "" ? null : body.cohortId;
  const normalizedSalesOwnerId = body.salesOwnerId === "" ? null : body.salesOwnerId;
  const normalizedDeliveryOwnerId = body.deliveryOwnerId === "" ? null : body.deliveryOwnerId;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!student) {
    return NextResponse.json({ message: "学员不存在" }, { status: 404 });
  }

  if (nextStatus && !studentManualEditableStatuses.includes(nextStatus)) {
    return NextResponse.json(
      { message: "退款流程状态只能通过退款工作台推进，学员主档不能直接修改" },
      { status: 400 }
    );
  }

  if (
    nextStatus &&
    protectedRefundStatuses.includes(student.status) &&
    nextStatus !== student.status
  ) {
    return NextResponse.json(
      { message: "当前学员已进入退款流程，需在退款工作台中处理状态变更" },
      { status: 400 }
    );
  }

  const latestEnrollment = student.enrollments[0];

  if (permissions.canEditStudentSales && body.phone && body.phone !== student.phone) {
    const duplicatedStudent = await prisma.student.findUnique({
      where: { phone: body.phone },
      select: { id: true }
    });

    if (duplicatedStudent) {
      return NextResponse.json({ message: "该手机号已被其他学员占用" }, { status: 409 });
    }
  }

  await prisma.student.update({
    where: { id },
    data: {
      name: permissions.canEditStudentSales ? body.name ?? undefined : undefined,
      phone: permissions.canEditStudentSales ? body.phone ?? undefined : undefined,
      status: permissions.canEditStudentSales ? nextStatus ?? undefined : undefined,
      currentStage:
        permissions.canEditStudentSales && nextStatus
          ? deriveStageFromStudentStatus(nextStatus)
          : undefined,
      riskLevel: permissions.canCreateRiskEvents ? body.riskLevel ?? undefined : undefined,
      salesOwnerId:
        permissions.canEditStudentSales && body.salesOwnerId !== undefined
          ? normalizedSalesOwnerId
          : undefined,
      deliveryOwnerId:
        permissions.canEditStudentDelivery && body.deliveryOwnerId !== undefined
          ? normalizedDeliveryOwnerId
          : undefined,
      cohortId:
        permissions.canEditStudentSales && body.cohortId !== undefined ? normalizedCohortId : undefined,
      intentNote:
        permissions.canEditStudentSales || permissions.canEditStudentDelivery
          ? body.intentNote ?? undefined
          : undefined,
      trackLane: permissions.canEditStudentSales ? body.trackLane ?? undefined : undefined,
      tags: permissions.canEditStudentSales ? body.tags ?? undefined : undefined
    }
  });

  if (latestEnrollment && body.enrollment) {
    const seatCardAmount = permissions.canEditStudentSales
      ? Number(body.enrollment.seatCardAmount ?? latestEnrollment.seatCardAmount)
      : latestEnrollment.seatCardAmount;
    const finalPaymentAmount = Number(
      permissions.canEditStudentSales
        ? body.enrollment.finalPaymentAmount ?? latestEnrollment.finalPaymentAmount
        : latestEnrollment.finalPaymentAmount
    );
    const seatCardStatus =
      seatCardAmount > 0
        ? (body.enrollment.seatCardStatus as PaymentStatus | undefined) ?? PaymentStatus.PAID
        : PaymentStatus.NOT_STARTED;
    const finalPaymentStatus =
      finalPaymentAmount > 0
        ? (body.enrollment.finalPaymentStatus as PaymentStatus | undefined) ?? PaymentStatus.PAID
        : PaymentStatus.NOT_STARTED;

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: latestEnrollment.id },
      data: {
        seatCardAmount,
        finalPaymentAmount,
        seatCardStatus,
        finalPaymentStatus,
        seatCardPaidAt: body.enrollment.seatCardPaidAt
          ? new Date(body.enrollment.seatCardPaidAt)
          : latestEnrollment.seatCardPaidAt,
        finalPaymentPaidAt: body.enrollment.finalPaymentPaidAt
          ? new Date(body.enrollment.finalPaymentPaidAt)
          : latestEnrollment.finalPaymentPaidAt,
        formallyEnrolledAt: body.enrollment.formallyEnrolledAt
          ? new Date(body.enrollment.formallyEnrolledAt)
          : latestEnrollment.formallyEnrolledAt,
        observationStartedAt: body.enrollment.observationStartedAt
          ? new Date(body.enrollment.observationStartedAt)
          : latestEnrollment.observationStartedAt,
        leadSourceLabel: permissions.canEditStudentDelivery
          ? body.enrollment.leadSourceLabel ?? latestEnrollment.leadSourceLabel
          : latestEnrollment.leadSourceLabel,
        tailPaymentOwnerId:
          permissions.canEditStudentDelivery
            ? body.enrollment.tailPaymentOwnerId === ""
              ? null
              : body.enrollment.tailPaymentOwnerId ?? latestEnrollment.tailPaymentOwnerId
            : latestEnrollment.tailPaymentOwnerId,
        handoffToDeliveryAt: permissions.canEditStudentDelivery
          ? body.enrollment.handoffToDeliveryAt
            ? new Date(body.enrollment.handoffToDeliveryAt)
            : body.enrollment.handoffToDeliveryAt === null
              ? null
              : latestEnrollment.handoffToDeliveryAt
          : latestEnrollment.handoffToDeliveryAt,
        totalReceived: seatCardAmount + finalPaymentAmount,
        currentStage: deriveStageFromEnrollment({
          wechatAddedAt: latestEnrollment.wechatAddedAt,
          publicCourseJoinedAt: latestEnrollment.publicCourseJoinedAt,
          seatCardStatus,
          finalPaymentStatus,
          formallyEnrolledAt: body.enrollment.formallyEnrolledAt
            ? new Date(body.enrollment.formallyEnrolledAt)
            : latestEnrollment.formallyEnrolledAt,
          observationStartedAt: body.enrollment.observationStartedAt
            ? new Date(body.enrollment.observationStartedAt)
            : latestEnrollment.observationStartedAt
        })
      }
    });

    await prisma.student.update({
      where: { id },
      data: {
        currentStage: updatedEnrollment.currentStage,
        status:
          permissions.canEditStudentSales
            ? nextStatus ??
              (updatedEnrollment.finalPaymentStatus === PaymentStatus.PAID
                ? StudentStatus.FORMALLY_ENROLLED
                : updatedEnrollment.seatCardStatus === PaymentStatus.PAID
                  ? StudentStatus.FINAL_PAYMENT_PENDING
                  : student.status)
            : student.status
      }
    });
    await upsertRevenueLedgerEntriesForEnrollment({
      enrollmentId: latestEnrollment.id,
      actorId: actor?.id ?? null
    });
  }

  const changedFields = [
    ["name", student.name, body.name],
    ["phone", student.phone, body.phone],
    ["status", student.status, nextStatus],
    ["cohortId", student.cohortId, normalizedCohortId],
    ["salesOwnerId", student.salesOwnerId, normalizedSalesOwnerId],
    ["deliveryOwnerId", student.deliveryOwnerId, normalizedDeliveryOwnerId],
    ["trackLane", student.trackLane, body.trackLane],
    ["intentNote", student.intentNote, body.intentNote]
  ].filter(([, from, to]) => to !== undefined && `${from ?? ""}` !== `${to ?? ""}`);

  for (const [fieldName, fromValue, toValue] of changedFields) {
    await createAuditLog({
      actorId: actor?.id ?? null,
      entityType: AuditEntityType.STUDENT,
      entityId: id,
      action: fieldName === "status" ? AuditActionType.STATUS_CHANGED : AuditActionType.UPDATED,
      fieldName,
      fromValue: fromValue == null ? null : String(fromValue),
      toValue: toValue == null ? null : String(toValue)
    });
  }

  const updated = await getStudentDetail(id);

  if (student.cohortId) {
    await recalculateCohortStats(student.cohortId);
  }

  if (normalizedCohortId && normalizedCohortId !== student.cohortId) {
    await recalculateCohortStats(normalizedCohortId);
  }

  return NextResponse.json(updated);
}
