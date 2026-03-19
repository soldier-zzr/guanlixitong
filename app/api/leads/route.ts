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
import { prisma } from "@/lib/server/db";
import { getLeads } from "@/lib/server/queries";
import { createAuditLog } from "@/lib/server/recompute";

export async function GET(request: Request) {
  const { dataScope } = await getCurrentActorContext();
  const { searchParams } = new URL(request.url);
  const data = await getLeads({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as LeadStatus | "ALL" | null) ?? "ALL",
    ownerId: searchParams.get("ownerId") || "ALL",
    campaignId: searchParams.get("campaignId") || "ALL"
  }, dataScope);

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { actor, permissions } = await getCurrentActorContext();
  if (!permissions.canInputLeads) {
    return NextResponse.json({ message: "当前岗位没有录入接量表权限" }, { status: 403 });
  }

  const body = await request.json();

  if (!body.name || !body.phone || !body.sourceTime) {
    return NextResponse.json({ message: "姓名、手机号、进线时间必填" }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: {
      name: body.name,
      phone: body.phone,
      city: body.city || null,
      sourceTime: new Date(body.sourceTime),
      orderInfo: body.orderInfo || null,
      intentLevel: body.intentLevel || "待承接评估",
      qualityScore: Number(body.qualityScore ?? 60),
      leadStatus: body.currentAssigneeId ? LeadStatus.ASSIGNED : LeadStatus.NEW,
      note: body.note || null,
      sourceOwnerId: actor?.id ?? null,
      campaignId: body.campaignId || null,
      creativeId: body.creativeId || null,
      currentAssigneeId: body.currentAssigneeId || null,
      assignments:
        body.currentAssigneeId
          ? {
              create: {
                assignedToId: body.currentAssigneeId,
                assignedAt: new Date(),
                result: AssignmentResult.PENDING
              }
            }
          : undefined,
      funnelEvents: {
        create: [
          {
            ownerId: body.currentAssigneeId || null,
            eventType: FunnelEventType.LEAD_INTAKE,
            stage: EnrollmentStage.LOW_PRICE,
            result: "进入线索池",
            eventAt: new Date(body.sourceTime),
            note: body.note || null
          },
          ...(body.currentAssigneeId
            ? [
                {
                  ownerId: body.currentAssigneeId,
                  eventType: FunnelEventType.ASSIGNED,
                  stage: EnrollmentStage.WECHAT,
                  result: "已分配销售",
                  eventAt: new Date()
                }
              ]
            : [])
        ]
      }
    }
  });
  await createAuditLog({
    actorId: actor?.id ?? null,
    entityType: AuditEntityType.LEAD,
    entityId: lead.id,
    action: AuditActionType.CREATED,
    note: "投放录入新增线索",
    metaJson: JSON.stringify({
      phone: body.phone,
      currentAssigneeId: body.currentAssigneeId || null
    })
  });

  return NextResponse.json(lead);
}
