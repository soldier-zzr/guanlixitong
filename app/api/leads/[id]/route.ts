import {
  AssignmentResult,
  AuditActionType,
  AuditEntityType,
  EnrollmentStage,
  FunnelEventType,
  LeadStatus
} from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentActorContext } from "@/lib/server/actor";
import { ensureDatabaseReady, prisma } from "@/lib/server/db";
import { createAuditLog } from "@/lib/server/recompute";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDatabaseReady();
  const { actor, permissions } = await getCurrentActorContext();
  if (!permissions.canHandleLeads) {
    return NextResponse.json({ message: "当前岗位没有承接线索权限" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      student: {
        select: { id: true }
      }
    }
  });

  if (!lead) {
    return NextResponse.json({ message: "线索不存在" }, { status: 404 });
  }

  if (body.action === "ASSIGN") {
    if (!permissions.canReassignLeads) {
      return NextResponse.json({ message: "当前岗位没有重新分配线索权限" }, { status: 403 });
    }
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
    await createAuditLog({
      actorId: actor?.id ?? null,
      entityType: AuditEntityType.LEAD,
      entityId: id,
      action: AuditActionType.UPDATED,
      note: "重新分配线索负责人",
      fieldName: "currentAssigneeId",
      fromValue: lead.currentAssigneeId ?? null,
      toValue: body.assignedToId
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
    await createAuditLog({
      actorId: actor?.id ?? null,
      entityType: AuditEntityType.LEAD,
      entityId: id,
      action: AuditActionType.STATUS_CHANGED,
      fieldName: "leadStatus",
      fromValue: lead.leadStatus,
      toValue: nextStatus,
      note: body.note ?? null
    });

    return NextResponse.json(updated);
  }

  if (body.action === "UPDATE_PROFILE") {
    const nextName = typeof body.name === "string" ? body.name.trim() : lead.name;
    if (!nextName) {
      return NextResponse.json({ message: "昵称不能为空" }, { status: 400 });
    }

    const [, updatedLead] = await prisma.$transaction([
      lead.student
        ? prisma.student.update({
            where: { id: lead.student.id },
            data: { name: nextName }
          })
        : prisma.$executeRaw`SELECT 1`,
      prisma.lead.update({
        where: { id },
        data: {
          name: nextName,
          note: body.note ?? lead.note
        }
      })
    ]);
    await createAuditLog({
      actorId: actor?.id ?? null,
      entityType: AuditEntityType.LEAD,
      entityId: id,
      action: AuditActionType.UPDATED,
      fieldName: "name",
      fromValue: lead.name,
      toValue: nextName,
      note: "私域修正昵称"
    });

    return NextResponse.json(updatedLead);
  }

  return NextResponse.json({ message: "不支持的 action" }, { status: 400 });
}
