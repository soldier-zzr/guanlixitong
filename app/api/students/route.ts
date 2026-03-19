import { EnrollmentStage, LeadStatus, PaymentStatus, StudentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentActorContext } from "@/lib/server/actor";
import { protectedRefundStatuses } from "@/lib/server/config";
import { prisma } from "@/lib/server/db";
import { getStudents } from "@/lib/server/queries";
import {
  createAuditLog,
  deriveStageFromEnrollment,
  deriveStudentStatusFromEnrollment,
  recalculateCohortStats,
  upsertRevenueLedgerEntriesForEnrollment
} from "@/lib/server/recompute";
import { AuditActionType, AuditEntityType } from "@prisma/client";

export async function GET(request: Request) {
  const { dataScope } = await getCurrentActorContext();
  const { searchParams } = new URL(request.url);
  const data = await getStudents({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as StudentStatus | "ALL" | null) ?? "ALL",
    ownerId: searchParams.get("ownerId") || "ALL",
    cohortId: searchParams.get("cohortId") || "ALL"
  }, dataScope);

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { actor, permissions } = await getCurrentActorContext();
  if (!permissions.canCreateStudents) {
    return NextResponse.json({ message: "当前岗位没有新增学员权限" }, { status: 403 });
  }

  const body = await request.json();
  const seatCardAmount = Number(body.seatCardAmount ?? 0);
  const finalPaymentAmount = Number(body.finalPaymentAmount ?? 0);
  const seatCardStatus =
    seatCardAmount > 0 ? PaymentStatus.PAID : PaymentStatus.NOT_STARTED;
  const finalPaymentStatus =
    finalPaymentAmount > 0 ? PaymentStatus.PAID : PaymentStatus.NOT_STARTED;

  if (!body.name || !body.phone) {
    return NextResponse.json({ message: "姓名和手机号必填" }, { status: 400 });
  }

  const existingStudent = await prisma.student.findUnique({
    where: { phone: body.phone }
  });

  const student = existingStudent
    ? await prisma.student.update({
        where: { id: existingStudent.id },
        data: {
          name: body.name || existingStudent.name,
          city: body.city || existingStudent.city,
          sourceChannel: body.sourceChannel || existingStudent.sourceChannel || "短视频投流",
          sourceCampaign: body.sourceCampaign || existingStudent.sourceCampaign,
          lowPriceCourseName: body.lowPriceCourseName || existingStudent.lowPriceCourseName || "4天公开直播课",
          lowPricePurchaseAt: body.lowPricePurchaseAt ? new Date(body.lowPricePurchaseAt) : existingStudent.lowPricePurchaseAt,
          lowPriceAmount: Number(body.lowPriceAmount ?? existingStudent.lowPriceAmount ?? 99),
          wechatAddedAt: body.wechatAddedAt ? new Date(body.wechatAddedAt) : existingStudent.wechatAddedAt,
          publicCourseJoinedAt: body.publicCourseJoinedAt ? new Date(body.publicCourseJoinedAt) : existingStudent.publicCourseJoinedAt,
          publicCourseAttendance: body.publicCourseAttendance || existingStudent.publicCourseAttendance,
          trackLane: body.trackLane || existingStudent.trackLane,
          leadId: existingStudent.leadId ?? body.leadId ?? null,
          cohortId: body.cohortId || existingStudent.cohortId,
          salesOwnerId: body.salesOwnerId || existingStudent.salesOwnerId,
          deliveryOwnerId: body.deliveryOwnerId || existingStudent.deliveryOwnerId
        }
      })
    : await prisma.student.create({
        data: {
          name: body.name,
          phone: body.phone,
          city: body.city || null,
          sourceChannel: body.sourceChannel || "短视频投流",
          sourceCampaign: body.sourceCampaign || null,
          lowPriceCourseName: body.lowPriceCourseName || "4天公开直播课",
          lowPricePurchaseAt: body.lowPricePurchaseAt ? new Date(body.lowPricePurchaseAt) : null,
          lowPriceAmount: Number(body.lowPriceAmount ?? 99),
          wechatAddedAt: body.wechatAddedAt ? new Date(body.wechatAddedAt) : null,
          publicCourseJoinedAt: body.publicCourseJoinedAt ? new Date(body.publicCourseJoinedAt) : null,
          publicCourseAttendance: body.publicCourseAttendance || null,
          trackLane: body.trackLane || null,
          leadId: body.leadId || null,
          cohortId: body.cohortId || null,
          salesOwnerId: body.salesOwnerId || null,
          deliveryOwnerId: body.deliveryOwnerId || null,
          status: StudentStatus.LOW_PRICE_PURCHASED,
          currentStage: EnrollmentStage.LOW_PRICE
        }
      });

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: student.id,
      cohortId: body.cohortId || null,
      courseVersion: body.courseVersion || "密训2.0",
      lowPriceCourseName: body.lowPriceCourseName || "4天公开直播课",
      lowPriceAmount: Number(body.lowPriceAmount ?? 99),
      lowPricePurchaseAt: body.lowPricePurchaseAt ? new Date(body.lowPricePurchaseAt) : null,
      wechatAddedAt: body.wechatAddedAt ? new Date(body.wechatAddedAt) : null,
      publicCourseJoinedAt: body.publicCourseJoinedAt ? new Date(body.publicCourseJoinedAt) : null,
      publicCourseLearning: body.publicCourseAttendance || null,
      seatCardAmount,
      seatCardStatus,
      seatCardPaidAt: body.seatCardPaidAt ? new Date(body.seatCardPaidAt) : null,
      finalPaymentAmount,
      finalPaymentStatus,
      finalPaymentPaidAt: body.finalPaymentPaidAt ? new Date(body.finalPaymentPaidAt) : null,
      totalReceived: seatCardAmount + finalPaymentAmount,
      formallyEnrolledAt: body.formallyEnrolledAt ? new Date(body.formallyEnrolledAt) : null,
      observationStartedAt: body.observationStartedAt ? new Date(body.observationStartedAt) : null,
      leadSourceLabel: body.leadSourceLabel || null,
      tailPaymentOwnerId: body.tailPaymentOwnerId || null,
      handoffToDeliveryAt: body.handoffToDeliveryAt ? new Date(body.handoffToDeliveryAt) : null,
      currentStage: deriveStageFromEnrollment({
        wechatAddedAt: body.wechatAddedAt ? new Date(body.wechatAddedAt) : null,
        publicCourseJoinedAt: body.publicCourseJoinedAt ? new Date(body.publicCourseJoinedAt) : null,
        seatCardStatus,
        finalPaymentStatus,
        formallyEnrolledAt: body.formallyEnrolledAt ? new Date(body.formallyEnrolledAt) : null,
        observationStartedAt: body.observationStartedAt ? new Date(body.observationStartedAt) : null
      }),
      note: body.note || null
    }
  });

  const nextStatus = deriveStudentStatusFromEnrollment(enrollment);
  const nextStage = deriveStageFromEnrollment(enrollment);

  await prisma.student.update({
    where: { id: student.id },
    data: {
      status: protectedRefundStatuses.includes(student.status) ? student.status : nextStatus,
      currentStage: protectedRefundStatuses.includes(student.status) ? student.currentStage : nextStage
    }
  });
  await upsertRevenueLedgerEntriesForEnrollment({
    enrollmentId: enrollment.id,
    actorId: actor?.id ?? null
  });
  await createAuditLog({
    actorId: actor?.id ?? null,
    entityType: AuditEntityType.ENROLLMENT,
    entityId: enrollment.id,
    action: existingStudent ? AuditActionType.UPDATED : AuditActionType.CREATED,
    note: existingStudent ? "同手机号学员新增一期报名记录" : "新增学员并建立首条报名记录",
    metaJson: JSON.stringify({
      studentId: student.id,
      cohortId: body.cohortId || null,
      seatCardAmount,
      finalPaymentAmount
    })
  });

  if (body.cohortId) {
    await recalculateCohortStats(body.cohortId);
  }

  if (body.leadId) {
    await prisma.lead.update({
      where: { id: body.leadId },
      data: {
        leadStatus: body.wechatAddedAt ? LeadStatus.WECHAT_ADDED : LeadStatus.CONVERTED
      }
    });
  }

  return NextResponse.json({
    studentId: student.id,
    enrollmentId: enrollment.id,
    reusedStudent: Boolean(existingStudent)
  });
}
