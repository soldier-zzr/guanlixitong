import { PaymentStatus, RefundStatus, StudentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { getStudentDetail } from "@/lib/server/queries";
import {
  deriveStageFromEnrollment,
  deriveStageFromStudentStatus,
  recalculateCohortStats
} from "@/lib/server/recompute";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const student = await getStudentDetail(id);

  if (!student) {
    return NextResponse.json({ message: "学员不存在" }, { status: 404 });
  }

  return NextResponse.json(student);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
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

  const latestEnrollment = student.enrollments[0];

  if (body.phone && body.phone !== student.phone) {
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
      name: body.name ?? undefined,
      phone: body.phone ?? undefined,
      status: body.status ?? undefined,
      currentStage: body.status ? deriveStageFromStudentStatus(body.status as StudentStatus) : undefined,
      riskLevel: body.riskLevel ?? undefined,
      salesOwnerId: normalizedSalesOwnerId,
      deliveryOwnerId: normalizedDeliveryOwnerId,
      cohortId: normalizedCohortId,
      intentNote: body.intentNote ?? undefined,
      trackLane: body.trackLane ?? undefined,
      tags: body.tags ?? undefined
    }
  });

  if (latestEnrollment && body.enrollment) {
    const seatCardAmount = Number(body.enrollment.seatCardAmount ?? latestEnrollment.seatCardAmount);
    const finalPaymentAmount = Number(
      body.enrollment.finalPaymentAmount ?? latestEnrollment.finalPaymentAmount
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
        leadSourceLabel: body.enrollment.leadSourceLabel ?? latestEnrollment.leadSourceLabel,
        tailPaymentOwnerId:
          body.enrollment.tailPaymentOwnerId === ""
            ? null
            : body.enrollment.tailPaymentOwnerId ?? latestEnrollment.tailPaymentOwnerId,
        handoffToDeliveryAt: body.enrollment.handoffToDeliveryAt
          ? new Date(body.enrollment.handoffToDeliveryAt)
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
          body.status ??
          (updatedEnrollment.finalPaymentStatus === PaymentStatus.PAID
            ? StudentStatus.FORMALLY_ENROLLED
            : updatedEnrollment.seatCardStatus === PaymentStatus.PAID
              ? StudentStatus.FINAL_PAYMENT_PENDING
              : student.status)
      }
    });
  }

  if ((body.status as StudentStatus | undefined) === StudentStatus.REFUNDED) {
    const refundRequest = await prisma.refundRequest.findFirst({
      where: { studentId: id, status: { not: RefundStatus.REFUNDED } },
      orderBy: { requestedAt: "desc" }
    });

    if (refundRequest) {
      await prisma.refundRequest.update({
        where: { id: refundRequest.id },
        data: {
          status: RefundStatus.REFUNDED
        }
      });
    }
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
