import {
  EnrollmentStage,
  PaymentStatus,
  Prisma,
  RefundLevel,
  RefundStatus,
  RiskLevel,
  StudentStatus
} from "@prisma/client";
import { prisma } from "@/lib/server/db";

function deriveRiskLevel(scores: number[]) {
  const maxScore = Math.max(...scores, 0);

  if (maxScore >= 7 || scores.length >= 4) {
    return RiskLevel.C;
  }

  if (maxScore >= 5 || scores.length >= 2) {
    return RiskLevel.B;
  }

  return RiskLevel.A;
}

export async function refreshStudentRisk(studentId: string) {
  const events = await prisma.riskEvent.findMany({
    where: { studentId },
    orderBy: { occurredAt: "desc" }
  });

  const nextRiskLevel = deriveRiskLevel(events.map((event) => event.severityScore));
  const currentStudent = await prisma.student.findUnique({
    where: { id: studentId },
    select: { status: true }
  });
  const refundLockedStatuses: StudentStatus[] = [
    StudentStatus.REFUND_REQUESTED,
    StudentStatus.LEVEL1_PROCESSING,
    StudentStatus.LEVEL2_PROCESSING,
    StudentStatus.LEVEL3_PROCESSING,
    StudentStatus.REFUNDED,
    StudentStatus.RETAINED,
    StudentStatus.CLOSED
  ];

  let nextStatus = currentStudent?.status ?? StudentStatus.LOW_PRICE_PURCHASED;
  if (refundLockedStatuses.includes(nextStatus)) {
    nextStatus = currentStudent?.status ?? nextStatus;
  } else if (nextRiskLevel !== RiskLevel.A) {
    nextStatus = StudentStatus.REFUND_WARNING;
  }

  return prisma.student.update({
    where: { id: studentId },
    data: {
      riskLevel: nextRiskLevel,
      status: nextStatus
    }
  });
}

export function deriveStudentStatusFromEnrollment(input: {
  lowPricePurchaseAt?: Date | null;
  wechatAddedAt?: Date | null;
  publicCourseJoinedAt?: Date | null;
  seatCardStatus: PaymentStatus;
  finalPaymentStatus: PaymentStatus;
  formallyEnrolledAt?: Date | null;
  observationStartedAt?: Date | null;
}) {
  if (input.observationStartedAt) {
    return StudentStatus.PRE_START_OBSERVING;
  }

  if (input.formallyEnrolledAt || input.finalPaymentStatus === PaymentStatus.PAID) {
    return StudentStatus.FORMALLY_ENROLLED;
  }

  if (input.seatCardStatus === PaymentStatus.PAID) {
    return StudentStatus.FINAL_PAYMENT_PENDING;
  }

  if (input.publicCourseJoinedAt) {
    return StudentStatus.IN_GROUP_LEARNING;
  }

  if (input.wechatAddedAt) {
    return StudentStatus.WECHAT_ADDED;
  }

  if (input.lowPricePurchaseAt) {
    return StudentStatus.LOW_PRICE_PURCHASED;
  }

  return StudentStatus.LOW_PRICE_PURCHASED;
}

export function deriveStageFromEnrollment(input: {
  wechatAddedAt?: Date | null;
  publicCourseJoinedAt?: Date | null;
  seatCardStatus: PaymentStatus;
  finalPaymentStatus: PaymentStatus;
  formallyEnrolledAt?: Date | null;
  observationStartedAt?: Date | null;
}) {
  if (input.observationStartedAt) {
    return EnrollmentStage.PRE_START;
  }

  if (input.formallyEnrolledAt || input.finalPaymentStatus === PaymentStatus.PAID) {
    return EnrollmentStage.FORMAL_ENROLLMENT;
  }

  if (input.seatCardStatus === PaymentStatus.PAID) {
    return EnrollmentStage.FINAL_PAYMENT;
  }

  if (input.publicCourseJoinedAt) {
    return EnrollmentStage.PUBLIC_COURSE;
  }

  if (input.wechatAddedAt) {
    return EnrollmentStage.WECHAT;
  }

  return EnrollmentStage.LOW_PRICE;
}

export function deriveStageFromStudentStatus(status: StudentStatus) {
  switch (status) {
    case StudentStatus.WECHAT_ADDED:
      return EnrollmentStage.WECHAT;
    case StudentStatus.IN_GROUP_LEARNING:
      return EnrollmentStage.PUBLIC_COURSE;
    case StudentStatus.SEAT_CARD_PAID:
      return EnrollmentStage.SEAT_CARD;
    case StudentStatus.FINAL_PAYMENT_PENDING:
      return EnrollmentStage.FINAL_PAYMENT;
    case StudentStatus.FORMALLY_ENROLLED:
      return EnrollmentStage.FORMAL_ENROLLMENT;
    case StudentStatus.PRE_START_OBSERVING:
      return EnrollmentStage.PRE_START;
    case StudentStatus.REFUND_WARNING:
    case StudentStatus.REFUND_REQUESTED:
    case StudentStatus.LEVEL1_PROCESSING:
    case StudentStatus.LEVEL2_PROCESSING:
    case StudentStatus.LEVEL3_PROCESSING:
    case StudentStatus.RETAINED:
    case StudentStatus.REFUNDED:
    case StudentStatus.CLOSED:
      return EnrollmentStage.REFUND;
    case StudentStatus.LOW_PRICE_PURCHASED:
    default:
      return EnrollmentStage.LOW_PRICE;
  }
}

export async function syncStudentFromEnrollment(studentId: string, enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId }
  });

  if (!enrollment) {
    return null;
  }

  return prisma.student.update({
    where: { id: studentId },
    data: {
      lowPricePurchaseAt: enrollment.lowPricePurchaseAt,
      lowPriceAmount: enrollment.lowPriceAmount,
      wechatAddedAt: enrollment.wechatAddedAt,
      publicCourseJoinedAt: enrollment.publicCourseJoinedAt,
      publicCourseAttendance: enrollment.publicCourseLearning,
      currentStage: deriveStageFromEnrollment(enrollment),
      status: deriveStudentStatusFromEnrollment(enrollment)
    }
  });
}

export async function recalculateCohortStats(cohortId: string) {
  const cohort = await prisma.cohort.findUnique({
    where: { id: cohortId },
    include: {
      students: {
        include: {
          riskEvents: true
        }
      },
      enrollments: true
    }
  });

  if (!cohort) {
    return null;
  }

  const refunds = await prisma.refundRequest.findMany({
    where: {
      student: {
        cohortId
      },
      status: RefundStatus.REFUNDED
    }
  });

  const seatCardRevenue = cohort.enrollments.reduce((sum, item) => {
    const paidLikeStatuses: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.REFUNDED];
    if (paidLikeStatuses.includes(item.seatCardStatus)) {
      return sum + item.seatCardAmount;
    }

    return sum;
  }, 0);

  const finalRevenue = cohort.enrollments.reduce((sum, item) => {
    const paidLikeStatuses: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.REFUNDED];
    if (paidLikeStatuses.includes(item.finalPaymentStatus)) {
      return sum + item.finalPaymentAmount;
    }

    return sum;
  }, 0);

  const grossRevenue = seatCardRevenue + finalRevenue;
  const refundAmount = refunds.reduce((sum, item) => sum + item.refundedAmount, 0);
  const netRevenue = grossRevenue - refundAmount;
  const grossRoi = cohort.adSpend > 0 ? grossRevenue / cohort.adSpend : 0;
  const netRoi = cohort.adSpend > 0 ? netRevenue / cohort.adSpend : 0;
  const warningCount = cohort.students.filter((item) => item.riskLevel !== RiskLevel.A).length;

  return prisma.roiPeriodStat.upsert({
    where: { cohortId },
    update: {
      adSpend: cohort.adSpend,
      seatCardRevenue,
      finalRevenue,
      grossRevenue,
      refundAmount,
      netRevenue,
      grossRoi,
      netRoi,
      refundCount: refunds.length,
      warningCount,
      studentCount: cohort.students.length,
      computedAt: new Date()
    },
    create: {
      cohortId,
      adSpend: cohort.adSpend,
      seatCardRevenue,
      finalRevenue,
      grossRevenue,
      refundAmount,
      netRevenue,
      grossRoi,
      netRoi,
      refundCount: refunds.length,
      warningCount,
      studentCount: cohort.students.length,
      computedAt: new Date()
    }
  });
}

export async function recalculateAllCohortStats() {
  const cohorts = await prisma.cohort.findMany({
    select: { id: true }
  });

  for (const cohort of cohorts) {
    await recalculateCohortStats(cohort.id);
  }
}

export function nextRefundLevel(level: RefundLevel) {
  if (level === RefundLevel.LEVEL1) {
    return RefundLevel.LEVEL2;
  }

  if (level === RefundLevel.LEVEL2) {
    return RefundLevel.LEVEL3;
  }

  return RefundLevel.LEVEL3;
}

export async function applyRefundStatusUpdate(args: {
  refundRequestId: string;
  status: RefundStatus;
  level?: RefundLevel;
  actorId?: string | null;
  note?: string;
  refundedAmount?: number;
  retainedAmount?: number;
  finalResult?: string;
  actionType: Prisma.RefundActionCreateWithoutRefundRequestInput["actionType"];
}) {
  const refundRequest = await prisma.refundRequest.findUnique({
    where: { id: args.refundRequestId },
    include: { student: true }
  });

  if (!refundRequest) {
    throw new Error("退款单不存在");
  }

  const nextLevel = args.level ?? refundRequest.currentLevel;
  const nextStudentStatus =
    args.status === RefundStatus.RETAINED
      ? StudentStatus.RETAINED
      : args.status === RefundStatus.REFUNDED
        ? StudentStatus.REFUNDED
        : nextLevel === RefundLevel.LEVEL1
          ? StudentStatus.LEVEL1_PROCESSING
          : nextLevel === RefundLevel.LEVEL2
            ? StudentStatus.LEVEL2_PROCESSING
            : StudentStatus.LEVEL3_PROCESSING;

  const updated = await prisma.refundRequest.update({
    where: { id: args.refundRequestId },
    data: {
      status: args.status,
      currentLevel: nextLevel,
      refundedAmount: args.refundedAmount ?? refundRequest.refundedAmount,
      retainedAmount: args.retainedAmount ?? refundRequest.retainedAmount,
      finalResult: args.finalResult ?? refundRequest.finalResult,
      resolvedAt:
        args.status === RefundStatus.RETAINED ||
        args.status === RefundStatus.REFUNDED ||
        args.status === RefundStatus.CLOSED
          ? new Date()
          : refundRequest.resolvedAt,
      actions: {
        create: {
          actionType: args.actionType,
          fromLevel: refundRequest.currentLevel,
          toLevel: nextLevel,
          actorId: args.actorId,
          note: args.note,
          outcome: args.finalResult,
          actedAt: new Date()
        }
      }
    }
  });

  await prisma.student.update({
    where: { id: refundRequest.studentId },
    data: {
      status: nextStudentStatus
    }
  });

  if (refundRequest.student.cohortId) {
    await recalculateCohortStats(refundRequest.student.cohortId);
  }

  return updated;
}
