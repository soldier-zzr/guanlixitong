import { AssignmentResult, EnrollmentStage, FunnelEventType, LeadStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json();
  const lead = await prisma.lead.findUnique({
    where: { id }
  });

  if (!lead) {
    return NextResponse.json({ message: "线索不存在" }, { status: 404 });
  }

  if (body.action === "ASSIGN") {
    if (!body.assignedToId) {
      return NextResponse.json({ message: "缺少 assignedToId" }, { status: 400 });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        currentAssigneeId: body.assignedToId,
        leadStatus: LeadStatus.ASSIGNED,
        intentLevel: body.intentLevel ?? lead.intentLevel,
        assignments: {
          create: {
            assignedToId: body.assignedToId,
            assignedAt: new Date(),
            result: AssignmentResult.PENDING,
            note: body.note || null
          }
        },
        funnelEvents: {
          create: {
            ownerId: body.assignedToId,
            eventType: FunnelEventType.ASSIGNED,
            stage: EnrollmentStage.WECHAT,
            result: "已分配销售",
            eventAt: new Date(),
            note: body.note || null
          }
        }
      }
    });

    return NextResponse.json(updated);
  }

  if (body.action === "UPDATE_STATUS") {
    const nextStatus = (body.leadStatus as LeadStatus | undefined) ?? lead.leadStatus;
    const updated = await prisma.lead.update({
      where: { id },
      data: {
        leadStatus: nextStatus,
        intentLevel: body.intentLevel ?? lead.intentLevel,
        note: body.note ?? lead.note,
        funnelEvents:
          nextStatus === LeadStatus.CONTACTED
            ? {
                create: {
                  ownerId: lead.currentAssigneeId,
                  eventType: FunnelEventType.FIRST_CONTACT,
                  stage: EnrollmentStage.WECHAT,
                  result: "私域已联系",
                  eventAt: new Date(),
                  note: body.note ?? null
                }
              }
            : nextStatus === LeadStatus.WECHAT_ADDED
              ? {
                  create: {
                    ownerId: lead.currentAssigneeId,
                    eventType: FunnelEventType.ADD_WECHAT,
                    stage: EnrollmentStage.WECHAT,
                    result: "私域已加V",
                    eventAt: new Date(),
                    note: body.note ?? null
                  }
                }
              : nextStatus === LeadStatus.IN_GROUP
                ? {
                    create: {
                      ownerId: lead.currentAssigneeId,
                      eventType: FunnelEventType.JOIN_GROUP,
                      stage: EnrollmentStage.PUBLIC_COURSE,
                      result: "已进群",
                      eventAt: new Date(),
                      note: body.note ?? null
                    }
                  }
                : undefined
      }
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ message: "不支持的 action" }, { status: 400 });
}
