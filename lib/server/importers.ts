import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import * as XLSX from "xlsx";
import {
  AssignmentResult,
  EnrollmentStage,
  FunnelEventType,
  LeadStatus,
  PaymentStatus,
  RefundLevel,
  RefundStatus,
  RiskLevel,
  StudentStatus,
  UserRole
} from "@prisma/client";
import { prisma } from "@/lib/server/db";

function normalizePhone(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const raw = String(value).trim();
  if (raw.includes("e+") || raw.includes("E+")) {
    return String(Math.trunc(Number(raw)));
  }

  return raw.replace(/\.0$/, "");
}

function parseExcelDate(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      return null;
    }
    return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S);
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getRows(
  source: string | Buffer,
  sheetName?: string,
  headerRow = 1,
  startRow = 2
) {
  const workbook =
    typeof source === "string"
      ? XLSX.readFile(source, {
          cellDates: true
        })
      : XLSX.read(source, {
          cellDates: true,
          type: "buffer"
        });
  const worksheet = workbook.Sheets[sheetName ?? workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: null,
    raw: true
  });
  const headers = rows[headerRow] as string[];
  const records = rows.slice(startRow).filter((row) => row.some((value) => value !== null && value !== ""));
  return { headers, records };
}

async function findOrCreateUserByName(name: string, role: UserRole) {
  const trimmed = name.trim();
  let user = await prisma.user.findFirst({
    where: { name: trimmed }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: trimmed,
        role,
        email: `${trimmed.replace(/\s+/g, "").toLowerCase()}-${role.toLowerCase()}@import.local`
      }
    });
  }

  return user;
}

function mapTailStatus(tailStatus: string | null) {
  if (tailStatus === "退款") {
    return StudentStatus.REFUNDED;
  }

  if (tailStatus === "已付") {
    return StudentStatus.FORMALLY_ENROLLED;
  }

  if (tailStatus === "保留占位" || tailStatus === "已追代付款") {
    return StudentStatus.FINAL_PAYMENT_PENDING;
  }

  return StudentStatus.IN_GROUP_LEARNING;
}

function mapRefundReason(reason: string | null) {
  if (!reason) {
    return { category: "其他", subcategory: "特殊客诉" };
  }

  if (/[家人|老公|老婆|对象|父母]/.test(reason)) {
    return { category: "家人反对", subcategory: "共同决策未通过" };
  }

  if (/[没时间|太忙|精力|执行]/.test(reason)) {
    return { category: "时间精力问题", subcategory: "执行时间不足" };
  }

  if (/[贵|价格|预算|钱]/.test(reason)) {
    return { category: "经济压力问题", subcategory: "近期现金流紧张" };
  }

  if (/[不适合|不稳|课程|节奏]/.test(reason)) {
    return { category: "课程预期不符", subcategory: "认为不适合当前阶段" };
  }

  if (/[学不会|跟不上|不会]/.test(reason)) {
    return { category: "自我怀疑/怕学不会", subcategory: "基础差担心跟不上" };
  }

  return { category: "其他", subcategory: "特殊客诉" };
}

async function ensureFunnelEvent(data: {
  leadId?: string | null;
  studentId?: string | null;
  ownerId?: string | null;
  eventType: FunnelEventType;
  stage: EnrollmentStage;
  result: string;
  eventAt: Date;
  note?: string | null;
}) {
  const exists = await prisma.salesFunnelEvent.findFirst({
    where: {
      leadId: data.leadId ?? null,
      studentId: data.studentId ?? null,
      ownerId: data.ownerId ?? null,
      eventType: data.eventType,
      eventAt: data.eventAt
    }
  });

  if (!exists) {
    await prisma.salesFunnelEvent.create({
      data
    });
  }
}

function buildImportedRefundRequestNo() {
  return `IMP-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export async function importIntakeWorkbook(filePathOrBuffer: string | Buffer) {
  if (typeof filePathOrBuffer === "string" && !existsSync(filePathOrBuffer)) {
    throw new Error(`文件不存在: ${filePathOrBuffer}`);
  }

  const { headers, records } = getRows(filePathOrBuffer, "Sheet1", 1, 2);
  let created = 0;
  let updated = 0;

  for (const [rowIndex, row] of records.entries()) {
    const payload = Object.fromEntries(headers.map((header, index) => [header, row[index]]));
    const phone = normalizePhone(payload["手机号"]);
    if (!phone) {
      continue;
    }

    const nickname = payload["微信昵称"] || payload["昵称"] || payload["用户昵称"] || payload["手机号"];
    const assigneeName = payload["助教"] || payload["分配销售"] ? String(payload["助教"] || payload["分配销售"]).trim() : "";
    const assignee = assigneeName ? await findOrCreateUserByName(assigneeName, UserRole.SALES) : null;
    const sourceTime =
      parseExcelDate(payload["创建时间"]) ??
      parseExcelDate(payload["日期时间"]) ??
      parseExcelDate(payload["日期"]) ??
      new Date();
    const friendStatus = payload["是否好友"] ? String(payload["是否好友"]).trim() : "";
    const rawOrderInfo =
      payload["订单信息"] ||
      [payload["支付金额"], payload["支付状态"], payload["打开小程序"], payload["ai呼叫"]]
        .filter(Boolean)
        .join(" | ");
    const orderInfo = rawOrderInfo ? String(rawOrderInfo) : null;
    const note = [payload["备注"], payload["分配"], payload["意向等级"]].filter(Boolean).join(" | ");
    const leadStatus =
      friendStatus === "已加上"
        ? LeadStatus.WECHAT_ADDED
        : assignee
          ? LeadStatus.ASSIGNED
          : LeadStatus.NEW;

    const existing = await prisma.lead.findUnique({
      where: { phone }
    });

    const lead = existing
      ? await prisma.lead.update({
          where: { phone },
          data: {
            name: String(nickname),
            city: null,
            sourceTime,
            orderInfo: orderInfo || existing.orderInfo,
            intentLevel: payload["意向等级"] ? String(payload["意向等级"]) : existing.intentLevel,
            qualityScore: friendStatus === "已加上" ? 75 : 58,
            leadStatus,
            note: note || existing.note,
            currentAssigneeId: assignee?.id ?? existing.currentAssigneeId
          }
        })
      : await prisma.lead.create({
          data: {
            name: String(nickname),
            phone,
            sourceTime,
            orderInfo: orderInfo || null,
            intentLevel: payload["意向等级"] ? String(payload["意向等级"]) : "中意向",
            qualityScore: friendStatus === "已加上" ? 75 : 58,
            leadStatus,
            note,
            currentAssigneeId: assignee?.id ?? null
          }
        });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }

    if (assignee) {
      const existingAssignment = await prisma.leadAssignment.findFirst({
        where: {
          leadId: lead.id,
          assignedToId: assignee.id
        },
        orderBy: { assignedAt: "desc" }
      });

      if (!existingAssignment) {
        await prisma.leadAssignment.create({
          data: {
            leadId: lead.id,
            assignedToId: assignee.id,
            assignedAt: sourceTime,
            firstContactAt: sourceTime,
            responseMinutes: 0,
            isTimeout: note.includes("超"),
            result: friendStatus === "已加上" ? AssignmentResult.CONTACTED : AssignmentResult.PENDING,
            note
          }
        });
      }
    }

    await ensureFunnelEvent({
      leadId: lead.id,
      ownerId: assignee?.id ?? null,
      eventType: FunnelEventType.LEAD_INTAKE,
      stage: EnrollmentStage.LOW_PRICE,
      result: "导入前端接量表",
      eventAt: sourceTime,
      note
    });

    if (assignee) {
      await ensureFunnelEvent({
        leadId: lead.id,
        ownerId: assignee.id,
        eventType: FunnelEventType.ASSIGNED,
        stage: EnrollmentStage.WECHAT,
        result: "已分配助教",
        eventAt: sourceTime,
        note
      });
    }

    if (friendStatus === "已加上") {
      await ensureFunnelEvent({
        leadId: lead.id,
        ownerId: assignee?.id ?? null,
        eventType: FunnelEventType.ADD_WECHAT,
        stage: EnrollmentStage.WECHAT,
        result: "已加上好友",
        eventAt: sourceTime,
        note
      });
    }
  }

  return {
    source: "front_intake",
    created,
    updated,
    totalRows: records.length
  };
}

export async function importTailWorkbook(filePathOrBuffer: string | Buffer) {
  if (typeof filePathOrBuffer === "string" && !existsSync(filePathOrBuffer)) {
    throw new Error(`文件不存在: ${filePathOrBuffer}`);
  }

  const { headers, records } = getRows(filePathOrBuffer, undefined, 0, 1);
  let studentsUpserted = 0;
  let refundsCreated = 0;

  for (const [rowIndex, row] of records.entries()) {
    const payload = Object.fromEntries(headers.map((header, index) => [header, row[index]]));
    const phone = normalizePhone(payload["手机号"]);
    if (!phone) {
      continue;
    }

    const cohortCode = String(payload["转化期数"] || "未归档营期").trim();
    const channelSource = String(payload["渠道来源"] || "未知来源").trim();
    const platform = payload["售卖平台"] ? String(payload["售卖平台"]).trim() : "未知平台";
    const salesName = payload["尾款电话筛选人"] ? String(payload["尾款电话筛选人"]).trim() : "";
    const deliveryName = payload["负责人（教练）"] ? String(payload["负责人（教练）"]).trim() : "";
    const salesUser = salesName ? await findOrCreateUserByName(salesName, UserRole.SALES) : null;
    const deliveryUser = deliveryName ? await findOrCreateUserByName(deliveryName, UserRole.DELIVERY) : null;
    const dealAt = parseExcelDate(payload["成交日期"]) ?? new Date();
    const followUpAt = parseExcelDate(payload["实际跟进日期"]) ?? dealAt;
    const tailStatus = payload["尾款情况"] ? String(payload["尾款情况"]).trim() : null;
    const note = [payload["沟通记录"], payload["未付款原因"], payload["超时状态"]].filter(Boolean).join(" | ");

    const cohort = await prisma.cohort.upsert({
      where: { code: cohortCode },
      update: {},
      create: {
        code: cohortCode,
        name: cohortCode,
        courseVersion: "密训2.0",
        startDate: dealAt,
        adSpend: 0,
        targetRevenue: 0
      }
    });

    const linkedLead = await prisma.lead.findUnique({
      where: { phone }
    });

    const student = await prisma.student.upsert({
      where: { phone },
      update: {
        name: String(payload["微信昵称"] || phone),
        sourceChannel: platform,
        sourceCampaign: channelSource,
        cohortId: cohort.id,
        salesOwnerId: salesUser?.id ?? null,
        deliveryOwnerId: deliveryUser?.id ?? null,
        lowPricePurchaseAt: followUpAt,
        wechatAddedAt: parseExcelDate(payload["加ip时间"]) ?? followUpAt,
        leadId: linkedLead?.id ?? undefined,
        intentNote: note,
        status: mapTailStatus(tailStatus)
      },
      create: {
        name: String(payload["微信昵称"] || phone),
        phone,
        sourceChannel: platform,
        sourceCampaign: channelSource,
        cohortId: cohort.id,
        salesOwnerId: salesUser?.id ?? null,
        deliveryOwnerId: deliveryUser?.id ?? null,
        lowPriceCourseName: payload["渠道"] ? String(payload["渠道"]) : "低价课",
        lowPricePurchaseAt: followUpAt,
        wechatAddedAt: parseExcelDate(payload["加ip时间"]) ?? followUpAt,
        publicCourseJoinedAt: payload["是否拉群"] ? followUpAt : null,
        publicCourseAttendance: payload["沟通记录"] ? "已跟进" : null,
        status: mapTailStatus(tailStatus),
        riskLevel:
          tailStatus === "退款"
            ? RiskLevel.C
            : tailStatus === "已追代付款"
              ? RiskLevel.B
              : RiskLevel.A,
        currentStage:
          tailStatus === "退款"
            ? EnrollmentStage.REFUND
            : tailStatus === "已付"
              ? EnrollmentStage.PRE_START
              : EnrollmentStage.FINAL_PAYMENT,
        leadId: linkedLead?.id ?? null,
        intentNote: note
      }
    });

    studentsUpserted += 1;

    const isFullPayment = channelSource.includes("直播全款");
    const seatCardAmount = isFullPayment ? 0 : 980;
    const finalPaymentAmount =
      tailStatus === "已付" ? (isFullPayment ? 6980 : 6000) : 0;

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        cohortId: cohort.id
      }
    });

    if (existingEnrollment) {
      await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          courseVersion: "密训2.0",
          seatCardAmount,
          seatCardStatus: seatCardAmount > 0 ? PaymentStatus.PAID : PaymentStatus.NOT_STARTED,
          seatCardPaidAt: seatCardAmount > 0 ? dealAt : null,
          finalPaymentAmount,
          finalPaymentStatus: finalPaymentAmount > 0 ? PaymentStatus.PAID : PaymentStatus.NOT_STARTED,
          finalPaymentPaidAt: finalPaymentAmount > 0 ? dealAt : null,
          totalReceived: seatCardAmount + finalPaymentAmount,
          formallyEnrolledAt: finalPaymentAmount > 0 ? dealAt : null,
          leadSourceLabel: channelSource,
          tailPaymentOwnerId: salesUser?.id ?? existingEnrollment.tailPaymentOwnerId,
          handoffToDeliveryAt: finalPaymentAmount > 0 ? followUpAt : existingEnrollment.handoffToDeliveryAt,
          currentStage:
            tailStatus === "退款"
              ? EnrollmentStage.REFUND
              : finalPaymentAmount > 0
                ? EnrollmentStage.PRE_START
                : EnrollmentStage.FINAL_PAYMENT,
          note
        }
      });
    } else {
      await prisma.enrollment.create({
        data: {
          studentId: student.id,
          cohortId: cohort.id,
          courseVersion: "密训2.0",
          lowPriceCourseName: payload["渠道"] ? String(payload["渠道"]) : "低价课",
          lowPricePurchaseAt: followUpAt,
          wechatAddedAt: parseExcelDate(payload["加ip时间"]) ?? followUpAt,
          seatCardAmount,
          seatCardStatus: seatCardAmount > 0 ? PaymentStatus.PAID : PaymentStatus.NOT_STARTED,
          seatCardPaidAt: seatCardAmount > 0 ? dealAt : null,
          finalPaymentAmount,
          finalPaymentStatus: finalPaymentAmount > 0 ? PaymentStatus.PAID : PaymentStatus.NOT_STARTED,
          finalPaymentPaidAt: finalPaymentAmount > 0 ? dealAt : null,
          totalReceived: seatCardAmount + finalPaymentAmount,
          formallyEnrolledAt: finalPaymentAmount > 0 ? dealAt : null,
          leadSourceLabel: channelSource,
          tailPaymentOwnerId: salesUser?.id ?? null,
          handoffToDeliveryAt: finalPaymentAmount > 0 ? followUpAt : null,
          currentStage:
            tailStatus === "退款"
              ? EnrollmentStage.REFUND
              : finalPaymentAmount > 0
                ? EnrollmentStage.PRE_START
                : EnrollmentStage.FINAL_PAYMENT,
          note
        }
      });
    }

    if (linkedLead) {
      await prisma.lead.update({
        where: { id: linkedLead.id },
        data: {
          leadStatus:
            tailStatus === "退款"
              ? LeadStatus.CONVERTED
              : tailStatus === "已付"
                ? LeadStatus.CONVERTED
                : LeadStatus.WECHAT_ADDED
        }
      });
    }

    if (salesUser) {
      await ensureFunnelEvent({
        leadId: linkedLead?.id ?? null,
        studentId: student.id,
        ownerId: salesUser.id,
        eventType: seatCardAmount > 0 ? FunnelEventType.PAY_SEAT_CARD : FunnelEventType.PAY_FULL,
        stage: seatCardAmount > 0 ? EnrollmentStage.SEAT_CARD : EnrollmentStage.FINAL_PAYMENT,
        result: channelSource,
        eventAt: dealAt,
        note
      });

      if (finalPaymentAmount > 0) {
        await ensureFunnelEvent({
          leadId: linkedLead?.id ?? null,
          studentId: student.id,
          ownerId: salesUser.id,
          eventType: FunnelEventType.PAY_FINAL_PAYMENT,
          stage: EnrollmentStage.FINAL_PAYMENT,
          result: tailStatus ?? "已付",
          eventAt: dealAt,
          note
        });

        await ensureFunnelEvent({
          leadId: linkedLead?.id ?? null,
          studentId: student.id,
          ownerId: salesUser.id,
          eventType: FunnelEventType.FORMAL_ENROLLMENT,
          stage: EnrollmentStage.FORMAL_ENROLLMENT,
          result: "导入中端尾款工单",
          eventAt: dealAt,
          note
        });
      }
    }

    if (tailStatus === "退款" || payload["申请退费"] || payload["退费原因"]) {
      const refundReasonText = payload["退费原因"]
        ? String(payload["退费原因"]).trim()
        : payload["未付款原因"]
          ? String(payload["未付款原因"]).trim()
          : "导入工单标记退款";
      const mappedReason = mapRefundReason(refundReasonText);
      const existingRefund = await prisma.refundRequest.findFirst({
        where: {
          studentId: student.id,
          requestSource: "Excel 中端尾款工单导入",
          requestedAt: dealAt,
          reasonCategory: mappedReason.category,
          reasonSubcategory: mappedReason.subcategory,
          requestNote: refundReasonText
        }
      });

      if (existingRefund) {
        await prisma.refundRequest.update({
          where: {
            id: existingRefund.id
          },
          data: {
            currentHandlerId: deliveryUser?.id ?? salesUser?.id ?? null,
            createdById: salesUser?.id ?? null,
            status: RefundStatus.REFUNDED,
            currentLevel: RefundLevel.LEVEL2,
            refundedAmount: 6980,
            finalResult: "由 Excel 工单导入为已退款"
          }
        });
      } else {
        await prisma.refundRequest.create({
          data: {
            requestNo: buildImportedRefundRequestNo(),
            studentId: student.id,
            currentHandlerId: deliveryUser?.id ?? salesUser?.id ?? null,
            createdById: salesUser?.id ?? null,
            reasonCategory: mappedReason.category,
            reasonSubcategory: mappedReason.subcategory,
            requestStage: EnrollmentStage.REFUND,
            requestNote: refundReasonText,
            requestSource: "Excel 中端尾款工单导入",
            requestedAt: dealAt,
            requestedAmount: 6980,
            currentLevel: RefundLevel.LEVEL2,
            status: RefundStatus.REFUNDED,
            refundedAmount: 6980,
            finalResult: "由 Excel 工单导入为已退款"
          }
        });
        refundsCreated += 1;
      }
    }
  }

  return {
    source: "mid_tail_workbook",
    studentsUpserted,
    refundsCreated,
    totalRows: records.length
  };
}
