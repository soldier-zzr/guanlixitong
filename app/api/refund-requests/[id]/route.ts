import {
  RefundActionType,
  RefundApprovalDecision,
  RefundStatus
} from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { applyRefundStatusUpdate, nextRefundLevel } from "@/lib/server/recompute";

async function ensureDeliveryApprovalNode(refundRequestId: string) {
  const refundRequest = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    include: {
      student: {
        select: {
          deliveryOwnerId: true
        }
      },
      enrollment: {
        select: {
          handoffToDeliveryAt: true
        }
      },
      approvals: {
        select: {
          approverId: true
        }
      }
    }
  });

  if (!refundRequest?.student.deliveryOwnerId || !refundRequest.enrollment?.handoffToDeliveryAt) {
    return;
  }

  const alreadyExists = refundRequest.approvals.some(
    (item) => item.approverId === refundRequest.student.deliveryOwnerId
  );

  if (alreadyExists) {
    return;
  }

  await prisma.refundApproval.create({
    data: {
      refundRequestId,
      approverId: refundRequest.student.deliveryOwnerId,
      decision: RefundApprovalDecision.PENDING
    }
  });

  await prisma.refundRequest.update({
    where: { id: refundRequestId },
    data: {
      actions: {
        create: {
          actionType: RefundActionType.NOTE,
          actorId: refundRequest.student.deliveryOwnerId,
          note: "退款已进入交付承接，自动补充交付同意节点",
          actedAt: new Date()
        }
      }
    }
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const action = body.action as string | undefined;

  if (!action) {
    return NextResponse.json({ message: "缺少 action" }, { status: 400 });
  }

  if (action === "ESCALATE") {
    const currentLevel = body.currentLevel;
    const nextLevelValue = nextRefundLevel(currentLevel);
    if (nextLevelValue === "LEVEL2") {
      await ensureDeliveryApprovalNode(id);
    }
    const updated = await applyRefundStatusUpdate({
      refundRequestId: id,
      status: RefundStatus.ESCALATED,
      level: nextLevelValue,
      actorId: body.actorId,
      note: body.note || "升级处理",
      finalResult: `升级至${nextLevelValue}`,
      actionType: RefundActionType.ESCALATED
    });
    return NextResponse.json(updated);
  }

  if (action === "RETAIN") {
    const updated = await applyRefundStatusUpdate({
      refundRequestId: id,
      status: RefundStatus.RETAINED,
      actorId: body.actorId,
      note: body.note || "挽回成功",
      retainedAmount: Number(body.retainedAmount ?? 6980),
      finalResult: body.finalResult || "已挽回",
      actionType: RefundActionType.RETAINED
    });
    return NextResponse.json(updated);
  }

  if (action === "REFUND") {
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id },
      include: { approvals: true }
    });

    if (!refundRequest) {
      return NextResponse.json({ message: "退款单不存在" }, { status: 404 });
    }

    const pendingApprovals = refundRequest.approvals.filter(
      (item) => item.decision !== RefundApprovalDecision.APPROVED
    );

    if (pendingApprovals.length > 0) {
      return NextResponse.json(
        { message: "退款前必须完成所有同意节点" },
        { status: 400 }
      );
    }

    const updated = await applyRefundStatusUpdate({
      refundRequestId: id,
      status: RefundStatus.REFUNDED,
      actorId: body.actorId,
      note: body.note || "确认退款",
      refundedAmount: Number(body.refundedAmount ?? 6980),
      finalResult: body.finalResult || "已退款",
      actionType: RefundActionType.APPROVED_REFUND
    });
    return NextResponse.json(updated);
  }

  if (action === "APPROVE") {
    if (!body.actorId) {
      return NextResponse.json({ message: "缺少审批人" }, { status: 400 });
    }

    const approval = await prisma.refundApproval.findUnique({
      where: {
        refundRequestId_approverId: {
          refundRequestId: id,
          approverId: body.actorId
        }
      }
    });

    if (!approval) {
      return NextResponse.json({ message: "当前人员不在退款同意名单中" }, { status: 400 });
    }

    const updatedApproval = await prisma.refundApproval.update({
      where: {
        refundRequestId_approverId: {
          refundRequestId: id,
          approverId: body.actorId
        }
      },
      data: {
        decision: RefundApprovalDecision.APPROVED,
        note: body.note || "同意退款",
        evidenceUrls: body.evidenceUrls || null,
        decidedAt: new Date()
      }
    });

    await prisma.refundRequest.update({
      where: { id },
      data: {
        actions: {
          create: {
            actionType: RefundActionType.NOTE,
            actorId: body.actorId,
            note: `退款同意：${body.note || "同意退款"}${body.evidenceUrls ? ` | 证据：${body.evidenceUrls}` : ""}`,
            actedAt: new Date()
          }
        }
      }
    });

    return NextResponse.json(updatedApproval);
  }

  if (action === "REJECT_APPROVAL") {
    if (!body.actorId) {
      return NextResponse.json({ message: "缺少审批人" }, { status: 400 });
    }

    const approval = await prisma.refundApproval.findUnique({
      where: {
        refundRequestId_approverId: {
          refundRequestId: id,
          approverId: body.actorId
        }
      }
    });

    if (!approval) {
      return NextResponse.json({ message: "当前人员不在退款同意名单中" }, { status: 400 });
    }

    const updatedApproval = await prisma.refundApproval.update({
      where: {
        refundRequestId_approverId: {
          refundRequestId: id,
          approverId: body.actorId
        }
      },
      data: {
        decision: RefundApprovalDecision.REJECTED,
        note: body.note || "不同意退款",
        evidenceUrls: body.evidenceUrls || null,
        decidedAt: new Date()
      }
    });

    await prisma.refundRequest.update({
      where: { id },
      data: {
        actions: {
          create: {
            actionType: RefundActionType.NOTE,
            actorId: body.actorId,
            note: `退款不同意：${body.note || "不同意退款"}${body.evidenceUrls ? ` | 证据：${body.evidenceUrls}` : ""}`,
            actedAt: new Date()
          }
        }
      }
    });

    return NextResponse.json(updatedApproval);
  }

  if (action === "NOTE") {
    const updated = await applyRefundStatusUpdate({
      refundRequestId: id,
      status: body.status || RefundStatus.PROCESSING,
      level: body.currentLevel,
      actorId: body.actorId,
      note: body.note || "补充跟进说明",
      finalResult: body.finalResult,
      actionType: RefundActionType.NOTE
    });
    return NextResponse.json(updated);
  }

  if (action === "CLOSE") {
    const updated = await applyRefundStatusUpdate({
      refundRequestId: id,
      status: RefundStatus.CLOSED,
      level: body.currentLevel,
      actorId: body.actorId,
      note: body.note || "关闭工单",
      finalResult: body.finalResult || "已结案",
      actionType: RefundActionType.CLOSED
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ message: "不支持的 action" }, { status: 400 });
}
