import { EnrollmentStage, PaymentStatus, StudentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { getStudents } from "@/lib/server/queries";
import {
  deriveStageFromEnrollment,
  deriveStudentStatusFromEnrollment,
  recalculateCohortStats
} from "@/lib/server/recompute";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = await getStudents({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as StudentStatus | "ALL" | null) ?? "ALL",
    ownerId: searchParams.get("ownerId") || "ALL",
    cohortId: searchParams.get("cohortId") || "ALL"
  });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
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

  const student = await prisma.student.create({
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
      status: nextStatus,
      currentStage: nextStage
    }
  });

  if (body.cohortId) {
    await recalculateCohortStats(body.cohortId);
  }

  return NextResponse.json({ studentId: student.id, enrollmentId: enrollment.id });
}
