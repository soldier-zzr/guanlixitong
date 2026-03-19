import {
  AuditActionType,
  AuditEntityType,
  RefundActionType,
  RefundApprovalDecision,
  RefundLevel,
  RefundStatus,
  StudentStatus
} from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentActorContext } from "@/lib/server/actor";
import { prisma } from "@/lib/server/db";
import { getRefundWorkbench } from "@/lib/server/queries";
import { createAuditLog, recalculateCohortStats } from "@/lib/server/recompute";

function getInitialApprovalActorIds(args: {
  salesOwnerId?: string | null;
  salesManagerId?: string | null;
  deliveryOwnerId?: string | null;
  handoffToDeliveryAt?: Date | null;
}) {
  return Array.from(
    new Set(
      [
        args.salesManagerId,
        args.handoffToDeliveryAt ? args.deliveryOwnerId : null
      ].filter(Boolean)
    )
  ) as string[];
}

function buildRequestNo() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 900 + 100);
  return `RR${stamp}${random}`;
}

export async function GET() {
  const { dataScope } = await getCurrentActorContext();
  const data = await getRefundWorkbench(dataScope);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { actor, permissions } = await getCurrentActorContext();
  if (!permissions.canCreateRefundRequests) {
    return NextResponse.json({ message: "当前岗位没有发起退款权限" }, { status: 403 });
  }

  const body = await request.json();

  if (!body.studentId || !body.reasonCategory || !body.reasonSubcategory) {
    return NextResponse.json({ message: "退款申请参数不完整" }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { id: body.studentId },
    include: {
      salesOwner: {
        select: {
          id: true,
          managerId: true
        }
      },
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
  const approvalActorIds = getInitialApprovalActorIds({
    salesOwnerId: student.salesOwnerId,
    salesManagerId: student.salesOwner?.managerId,
    deliveryOwnerId: student.deliveryOwnerId,
    handoffToDeliveryAt: latestEnrollment?.handoffToDeliveryAt
  });

  const refundRequest = await prisma.refundRequest.create({
    data: {
      requestNo: buildRequestNo(),
      studentId: body.studentId,
      enrollmentId: body.enrollmentId || latestEnrollment?.id || null,
      currentHandlerId: body.currentHandlerId || student.salesOwnerId || null,
      createdById: actor?.id || null,
      reasonCategory: body.reasonCategory,
      reasonSubcategory: body.reasonSubcategory,
      requestStage: body.requestStage || student.currentStage,
      requestNote: body.requestNote || null,
      requestSource: body.requestSource || "企微对话",
      requestedAt: body.requestedAt ? new Date(body.requestedAt) : new Date(),
      requestedAmount: Number(body.requestedAmount ?? 6980),
      currentLevel: RefundLevel.LEVEL1,
      status: RefundStatus.PROCESSING,
      approvals: {
        create:
          approvalActorIds.length > 0
            ? approvalActorIds.map((approverId) => ({
                approverId,
                decision: RefundApprovalDecision.PENDING
              }))
            : []
      },
      actions: {
        create: {
          actionType: RefundActionType.CREATED,
          fromLevel: RefundLevel.LEVEL1,
          toLevel: RefundLevel.LEVEL1,
          actorId: actor?.id || student.salesOwnerId || null,
          note: body.requestNote || "发起退款申请",
          actedAt: new Date()
        }
      }
    }
  });

  await prisma.student.update({
    where: { id: body.studentId },
    data: {
      status: StudentStatus.LEVEL1_PROCESSING
    }
  });
  await createAuditLog({
    actorId: actor?.id || null,
    entityType: AuditEntityType.REFUND_REQUEST,
    entityId: refundRequest.id,
    action: AuditActionType.CREATED,
    note: "发起退款申请",
    metaJson: JSON.stringify({
      studentId: body.studentId,
      approvalActorIds,
      currentHandlerId: body.currentHandlerId || student.salesOwnerId || null
    })
  });

  if (student.cohortId) {
    await recalculateCohortStats(student.cohortId);
  }

  return NextResponse.json(refundRequest);
}
