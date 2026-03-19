import {
  AssignmentResult,
  AuditActionType,
  AuditEntityType,
  EnrollmentStage,
  FunnelEventType,
  LeadStatus,
  UserTitle
} from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentActorContext } from "@/lib/server/actor";
import { prisma } from "@/lib/server/db";
import { createAuditLog } from "@/lib/server/recompute";

type BulkRow = {
  sourceTime?: string;
  phone?: string;
  name?: string;
  orderInfo?: string;
  assignedToName?: string;
  note?: string;
};

function parseDate(value?: string) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function POST(request: Request) {
  const { actor, permissions } = await getCurrentActorContext();
  if (!permissions.canInputLeads) {
    return NextResponse.json({ message: "当前岗位没有批量录入接量表权限" }, { status: 403 });
  }

  const body = await request.json();
  const rows = Array.isArray(body.rows) ? (body.rows as BulkRow[]) : [];

  if (rows.length === 0) {
    return NextResponse.json({ message: "没有可导入的数据" }, { status: 400 });
  }

  const salesUsers = await prisma.user.findMany({
    where: {
      active: true,
      title: {
        in: [UserTitle.SALES, UserTitle.PRIVATE_OPS]
      }
    },
    select: {
      id: true,
      name: true
    }
  });
  const salesUserMap = new Map(salesUsers.map((user) => [user.name.trim(), user.id]));

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const phone = String(row.phone ?? "").trim();
    if (!phone) {
      continue;
    }

    const sourceTime = parseDate(row.sourceTime);
    const assignedToName = String(row.assignedToName ?? "").trim();
    const assignedToId = salesUserMap.get(assignedToName) ?? null;
    const leadStatus = assignedToId ? LeadStatus.ASSIGNED : LeadStatus.NEW;

    const lead = await prisma.lead.create({
      data: {
        name: String(row.name ?? phone).trim(),
        phone,
        sourceTime,
        orderInfo: row.orderInfo?.trim() || null,
        note: row.note?.trim() || null,
        sourceOwnerId: actor?.id ?? null,
        currentAssigneeId: assignedToId,
        leadStatus
      }
    });

    created += 1;

    await prisma.salesFunnelEvent.create({
      data: {
        leadId: lead.id,
        ownerId: assignedToId,
        eventType: FunnelEventType.LEAD_INTAKE,
        stage: EnrollmentStage.LOW_PRICE,
        result: "投放批量粘贴导入",
        eventAt: sourceTime,
        note: row.note?.trim() || null
      }
    });

    await createAuditLog({
      actorId: actor?.id ?? null,
      entityType: AuditEntityType.LEAD,
      entityId: lead.id,
      action: AuditActionType.IMPORTED,
      note: "批量导入新线索实例",
      metaJson: JSON.stringify({
        phone,
        assignedToId,
        sourceTime
      })
    });

    if (assignedToId) {
      await prisma.leadAssignment.create({
        data: {
          leadId: lead.id,
          assignedToId,
          assignedAt: sourceTime,
          result: AssignmentResult.PENDING,
          note: row.note?.trim() || null
        }
      });

      await prisma.salesFunnelEvent.create({
        data: {
          leadId: lead.id,
          ownerId: assignedToId,
          eventType: FunnelEventType.ASSIGNED,
          stage: EnrollmentStage.WECHAT,
          result: "批量导入时已分配销售",
          eventAt: sourceTime,
          note: row.note?.trim() || null
        }
      });
    }
  }

  return NextResponse.json({
    created,
    updated,
    totalRows: rows.length
  });
}
