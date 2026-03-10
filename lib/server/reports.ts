import * as XLSX from "xlsx";
import { FunnelEventType, StudentStatus } from "@prisma/client";
import { prisma } from "@/lib/server/db";

export async function getBackendSummaryRows() {
  const [cohorts, users, assignments, leads, students, enrollments, roiStats, events] = await Promise.all([
    prisma.cohort.findMany(),
    prisma.user.findMany({
      where: { role: "SALES", active: true }
    }),
    prisma.leadAssignment.findMany({
      include: {
        lead: true
      }
    }),
    prisma.lead.findMany({
      include: {
        student: true
      }
    }),
    prisma.student.findMany(),
    prisma.enrollment.findMany(),
    prisma.roiPeriodStat.findMany({
      include: { cohort: true }
    }),
    prisma.salesFunnelEvent.findMany()
  ]);

  const rows = [];

  for (const cohort of cohorts) {
    for (const user of users) {
      const convertedStatuses: StudentStatus[] = [
        StudentStatus.FORMALLY_ENROLLED,
        StudentStatus.PRE_START_OBSERVING,
        StudentStatus.REFUND_WARNING,
        StudentStatus.REFUND_REQUESTED,
        StudentStatus.LEVEL1_PROCESSING,
        StudentStatus.LEVEL2_PROCESSING,
        StudentStatus.LEVEL3_PROCESSING,
        StudentStatus.RETAINED,
        StudentStatus.REFUNDED,
        StudentStatus.CLOSED
      ];
      const ownerStudents = students.filter(
        (item) => item.cohortId === cohort.id && item.salesOwnerId === user.id
      );
      const ownerEnrollments = enrollments.filter((item) =>
        ownerStudents.some((student) => student.id === item.studentId)
      );
      const ownerLeadIds = leads
        .filter((lead) => lead.student?.cohortId === cohort.id && lead.currentAssigneeId === user.id)
        .map((lead) => lead.id);
      const assignedCount = assignments.filter(
        (item) => ownerLeadIds.includes(item.leadId) || item.assignedToId === user.id
      ).length;
      const addWechatCount = events.filter(
        (item) =>
          item.ownerId === user.id &&
          item.eventType === FunnelEventType.ADD_WECHAT &&
          ownerStudents.some((student) => student.id === item.studentId)
      ).length;
      const groupCount = events.filter(
        (item) =>
          item.ownerId === user.id &&
          item.eventType === FunnelEventType.JOIN_GROUP &&
          ownerStudents.some((student) => student.id === item.studentId)
      ).length;
      const fullCount = events.filter(
        (item) =>
          item.ownerId === user.id &&
          item.eventType === FunnelEventType.PAY_FULL &&
          ownerStudents.some((student) => student.id === item.studentId)
      ).length;
      const seatCardCount = events.filter(
        (item) =>
          item.ownerId === user.id &&
          item.eventType === FunnelEventType.PAY_SEAT_CARD &&
          ownerStudents.some((student) => student.id === item.studentId)
      ).length;
      const finalPaidCount = events.filter(
        (item) =>
          item.ownerId === user.id &&
          item.eventType === FunnelEventType.PAY_FINAL_PAYMENT &&
          ownerStudents.some((student) => student.id === item.studentId)
      ).length;
      const totalOrders = ownerStudents.filter((item) => convertedStatuses.includes(item.status)).length;
      const highTicketCount = ownerEnrollments.filter((item) => item.totalReceived >= 6980).length;
      const revenue = ownerEnrollments.reduce((sum, item) => sum + item.totalReceived, 0);
      const cohortStat = roiStats.find((item) => item.cohortId === cohort.id);
      const cohortAssigned = assignments.filter((item) =>
        leads.some((lead) => lead.id === item.leadId && lead.student?.cohortId === cohort.id)
      ).length;
      const allocatedCost =
        cohortStat && cohortAssigned > 0 ? (assignedCount / cohortAssigned) * cohortStat.adSpend : 0;

      if (
        assignedCount === 0 &&
        addWechatCount === 0 &&
        groupCount === 0 &&
        totalOrders === 0 &&
        revenue === 0
      ) {
        continue;
      }

      rows.push({
        营期: cohort.code,
        归属人: user.name,
        账号: user.name,
        分配例子数: assignedCount,
        添加例子数: addWechatCount,
        添加率: assignedCount > 0 ? Number((addWechatCount / assignedCount).toFixed(3)) : 0,
        进群: groupCount,
        进群率: assignedCount > 0 ? Number((groupCount / assignedCount).toFixed(3)) : 0,
        加教练: ownerStudents.filter((item) => item.deliveryOwnerId).length,
        加教练率:
          assignedCount > 0
            ? Number(
                (
                  ownerStudents.filter((item) => item.deliveryOwnerId).length / assignedCount
                ).toFixed(3)
              )
            : 0,
        直播间全款数: fullCount,
        全款率: assignedCount > 0 ? Number((fullCount / assignedCount).toFixed(3)) : 0,
        占位数: seatCardCount,
        占位率: assignedCount > 0 ? Number((seatCardCount / assignedCount).toFixed(3)) : 0,
        占位成单: finalPaidCount,
        尾款率: seatCardCount > 0 ? Number((finalPaidCount / seatCardCount).toFixed(3)) : 0,
        总单数: totalOrders,
        整体转化率: assignedCount > 0 ? Number((totalOrders / assignedCount).toFixed(3)) : 0,
        高客单: highTicketCount,
        营收: revenue,
        成本: allocatedCost,
        "转化率：": assignedCount > 0 ? Number((totalOrders / assignedCount).toFixed(3)) : 0,
        ROI: allocatedCost > 0 ? Number((revenue / allocatedCost).toFixed(3)) : 0
      });
    }
  }

  return rows;
}

export async function buildBackendSummaryWorkbookBuffer() {
  const rows = await getBackendSummaryRows();
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      "营期",
      "归属人",
      "账号",
      "分配例子数",
      "添加例子数",
      "添加率",
      "进群",
      "进群率",
      "加教练",
      "加教练率",
      "直播间全款数",
      "全款率",
      "占位数",
      "占位率",
      "占位成单",
      "尾款率",
      "总单数",
      "整体转化率",
      "高客单",
      "营收",
      "成本",
      "转化率：",
      "ROI"
    ]
  });

  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "营期营收统计");
  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer"
  });
}
