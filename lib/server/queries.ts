import {
  EnrollmentStage,
  FunnelEventType,
  LeadStatus,
  RefundApprovalDecision,
  RefundStatus,
  RiskLevel,
  StudentStatus,
  type Prisma
} from "@prisma/client";
import { prisma } from "@/lib/server/db";
import {
  enrollmentStageLabelMap,
  funnelEventLabelMap,
  leadStatusLabelMap,
  refundLevelLabelMap,
  riskLevelLabelMap,
  studentStatusLabelMap
} from "@/lib/server/config";

type StudentFilters = {
  search?: string;
  status?: StudentStatus | "ALL";
  cohortId?: string | "ALL";
  ownerId?: string | "ALL";
};

type LeadFilters = {
  search?: string;
  status?: LeadStatus | "ALL";
  ownerId?: string | "ALL";
  campaignId?: string | "ALL";
};

export async function getLookupOptions() {
  const [users, cohorts, dictionaries, campaigns, creatives] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      include: {
        manager: {
          select: {
            name: true
          }
        }
      },
      orderBy: [{ role: "asc" }, { managerId: "asc" }, { name: "asc" }]
    }),
    prisma.cohort.findMany({
      orderBy: { startDate: "desc" }
    }),
    prisma.dictionary.findMany({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }]
    }),
    prisma.campaign.findMany({
      orderBy: { startAt: "desc" }
    }),
    prisma.adCreative.findMany({
      orderBy: [{ campaignId: "asc" }, { publishAt: "desc" }]
    })
  ]);

  return {
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      title: user.title,
      managerName: user.manager?.name ?? null
    })),
    cohorts,
    dictionaries,
    campaigns,
    creatives
  };
}

export async function getDashboardData() {
  const [students, cohorts, refundRequests, roiStats, leads, assignments, funnelEvents] = await Promise.all([
    prisma.student.findMany({
      include: {
        cohort: true,
        riskEvents: true
      }
    }),
    prisma.cohort.findMany({
      orderBy: { startDate: "asc" }
    }),
    prisma.refundRequest.findMany(),
    prisma.roiPeriodStat.findMany({
      include: { cohort: true },
      orderBy: { cohort: { startDate: "asc" } }
    }),
    prisma.lead.findMany(),
    prisma.leadAssignment.findMany(),
    prisma.salesFunnelEvent.findMany()
  ]);

  const totalStudents = students.length;
  const seatCardStatuses: StudentStatus[] = [
    StudentStatus.SEAT_CARD_PAID,
    StudentStatus.FINAL_PAYMENT_PENDING,
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
  const formalStatuses: StudentStatus[] = [
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
  const seatCardCount = students.filter((item) =>
    seatCardStatuses.includes(item.status)
  ).length;
  const finalPaymentCount = students.filter((item) =>
    formalStatuses.includes(item.status)
  ).length;
  const formalCount = students.filter((item) => item.status !== StudentStatus.LOW_PRICE_PURCHASED && item.status !== StudentStatus.WECHAT_ADDED && item.status !== StudentStatus.IN_GROUP_LEARNING && item.status !== StudentStatus.SEAT_CARD_PAID && item.status !== StudentStatus.FINAL_PAYMENT_PENDING).length;
  const warningCount = students.filter((item) => item.riskLevel !== RiskLevel.A).length;
  const refundedCount = refundRequests.filter((item) => item.status === RefundStatus.REFUNDED).length;
  const intakeCount = leads.length;
  const assignedCount = leads.filter((item) => item.currentAssigneeId).length;
  const timeoutCount = assignments.filter((item) => item.isTimeout).length;
  const unassignedCount = leads.filter((item) => !item.currentAssigneeId).length;
  const wechatCount = funnelEvents.filter((item) => item.eventType === FunnelEventType.ADD_WECHAT).length;
  const groupCount = funnelEvents.filter((item) => item.eventType === FunnelEventType.JOIN_GROUP).length;
  const intakeBase = intakeCount || 1;
  const funnelOverview = [
    { stage: funnelEventLabelMap.LEAD_INTAKE, count: intakeCount, rate: 1 },
    { stage: funnelEventLabelMap.ASSIGNED, count: assignedCount, rate: Number((assignedCount / intakeBase).toFixed(3)) },
    { stage: funnelEventLabelMap.ADD_WECHAT, count: wechatCount, rate: Number((wechatCount / intakeBase).toFixed(3)) },
    { stage: funnelEventLabelMap.JOIN_GROUP, count: groupCount, rate: Number((groupCount / intakeBase).toFixed(3)) },
    { stage: funnelEventLabelMap.PAY_SEAT_CARD, count: seatCardCount, rate: Number((seatCardCount / intakeBase).toFixed(3)) },
    { stage: funnelEventLabelMap.FORMAL_ENROLLMENT, count: formalCount, rate: Number((formalCount / intakeBase).toFixed(3)) }
  ];

  const grossRevenue = roiStats.reduce((sum, item) => sum + item.grossRevenue, 0);
  const refundAmount = roiStats.reduce((sum, item) => sum + item.refundAmount, 0);
  const netRevenue = roiStats.reduce((sum, item) => sum + item.netRevenue, 0);
  const adSpend = roiStats.reduce((sum, item) => sum + item.adSpend, 0);

  const grossRoi = adSpend > 0 ? grossRevenue / adSpend : 0;
  const netRoi = adSpend > 0 ? netRevenue / adSpend : 0;

  const riskDistribution = [
    { name: riskLevelLabelMap.A, value: students.filter((item) => item.riskLevel === RiskLevel.A).length },
    { name: riskLevelLabelMap.B, value: students.filter((item) => item.riskLevel === RiskLevel.B).length },
    { name: riskLevelLabelMap.C, value: students.filter((item) => item.riskLevel === RiskLevel.C).length }
  ];

  const refundTrend = cohorts.map((cohort) => {
    const stat = roiStats.find((item) => item.cohortId === cohort.id);

    return {
      period: cohort.code,
      refundRate:
        stat && stat.studentCount > 0 ? Number((stat.refundCount / stat.studentCount).toFixed(3)) : 0,
      refundCount: stat?.refundCount ?? 0,
      warningCount: stat?.warningCount ?? 0
    };
  });

  return {
    summary: {
      totalStudents,
      seatCardCount,
      finalPaymentCount,
      formalCount,
      warningCount,
      refundedCount,
      intakeCount,
      assignedCount,
      timeoutCount,
      unassignedCount,
      grossRevenue,
      refundAmount,
      netRevenue,
      grossRoi,
      netRoi
    },
    riskDistribution,
    refundTrend,
    funnelOverview,
    cohortStats: roiStats
  };
}

export async function getStudents(filters: StudentFilters = {}) {
  const andConditions: Prisma.StudentWhereInput[] = [];

  if (filters.search) {
    andConditions.push({
      OR: [
        { name: { contains: filters.search } },
        { phone: { contains: filters.search } },
        { sourceCampaign: { contains: filters.search } }
      ]
    });
  }

  if (filters.status && filters.status !== "ALL") {
    andConditions.push({ status: filters.status });
  }

  if (filters.cohortId && filters.cohortId !== "ALL") {
    andConditions.push({ cohortId: filters.cohortId });
  }

  if (filters.ownerId && filters.ownerId !== "ALL") {
    andConditions.push({
      OR: [{ salesOwnerId: filters.ownerId }, { deliveryOwnerId: filters.ownerId }]
    });
  }

  const where: Prisma.StudentWhereInput =
    andConditions.length > 0
      ? {
          AND: andConditions
        }
      : {};

  return prisma.student.findMany({
    where,
    include: {
      cohort: true,
      salesOwner: true,
      deliveryOwner: true,
      enrollments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          tailPaymentOwner: true
        }
      },
      refundRequests: {
        orderBy: { requestedAt: "desc" },
        take: 1
      }
    },
    orderBy: [{ updatedAt: "desc" }]
  });
}

export async function getStudentDetail(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    include: {
      lead: {
        include: {
          campaign: true,
          creative: true,
          currentAssignee: true,
          assignments: {
            include: {
              assignedTo: true
            },
            orderBy: { assignedAt: "desc" }
          }
        }
      },
      cohort: true,
      salesOwner: true,
      deliveryOwner: true,
      enrollments: {
        include: {
          tailPaymentOwner: true
        },
        orderBy: { createdAt: "desc" }
      },
      riskEvents: {
        include: { reporter: true },
        orderBy: { occurredAt: "desc" }
      },
      refundRequests: {
        include: {
          currentHandler: true,
          approvals: {
            include: {
              approver: true
            },
            orderBy: [{ decision: "asc" }, { createdAt: "asc" }]
          },
          actions: {
            include: { actor: true },
            orderBy: { actedAt: "desc" }
          }
        },
        orderBy: { requestedAt: "desc" }
      },
      funnelEvents: {
        include: {
          owner: true
        },
        orderBy: { eventAt: "desc" }
      }
    }
  });
}

export async function getLeads(filters: LeadFilters = {}) {
  const andConditions: Prisma.LeadWhereInput[] = [];

  if (filters.search) {
    andConditions.push({
      OR: [
        { name: { contains: filters.search } },
        { phone: { contains: filters.search } },
        { city: { contains: filters.search } }
      ]
    });
  }

  if (filters.status && filters.status !== "ALL") {
    andConditions.push({ leadStatus: filters.status });
  }

  if (filters.ownerId && filters.ownerId !== "ALL") {
    andConditions.push({ currentAssigneeId: filters.ownerId });
  }

  if (filters.campaignId && filters.campaignId !== "ALL") {
    andConditions.push({ campaignId: filters.campaignId });
  }

  const where: Prisma.LeadWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

  return prisma.lead.findMany({
    where,
    include: {
      campaign: true,
      creative: true,
      currentAssignee: true,
      student: true,
      assignments: {
        include: {
          assignedTo: true
        },
        orderBy: { assignedAt: "desc" },
        take: 1
      }
    },
    orderBy: [{ sourceTime: "desc" }]
  });
}

export async function getLeadOverview() {
  const [leads, campaigns, creatives, assignments] = await Promise.all([
    prisma.lead.findMany({
      include: {
        campaign: true,
        creative: true
      }
    }),
    prisma.campaign.findMany({
      include: {
        creatives: true
      }
    }),
    prisma.adCreative.findMany({
      include: {
        campaign: true
      }
    }),
    prisma.leadAssignment.findMany()
  ]);

  const responseSamples = assignments.filter((item) => item.responseMinutes !== null);

  return {
    summary: {
      totalLeads: leads.length,
      newLeads: leads.filter((item) => item.leadStatus === LeadStatus.NEW).length,
      assignedLeads: leads.filter((item) => item.currentAssigneeId).length,
      convertedLeads: leads.filter((item) => item.leadStatus === LeadStatus.CONVERTED).length,
      timeoutAssignments: assignments.filter((item) => item.isTimeout).length,
      averageResponseMinutes:
        responseSamples.length > 0
          ? responseSamples.reduce((sum, item) => sum + (item.responseMinutes ?? 0), 0) /
            responseSamples.length
          : 0
    },
    byCampaign: campaigns.map((campaign) => {
      const campaignLeads = leads.filter((item) => item.campaignId === campaign.id);
      const converted = campaignLeads.filter((item) => item.leadStatus === LeadStatus.CONVERTED).length;
      return {
        campaign: campaign.name,
        channel: campaign.channel,
        spentAmount: campaign.spentAmount,
        leads: campaignLeads.length,
        converted,
        conversionRate:
          campaignLeads.length > 0 ? Number((converted / campaignLeads.length).toFixed(3)) : 0
      };
    }),
    byCreative: creatives.map((creative) => {
      const creativeLeads = leads.filter((item) => item.creativeId === creative.id);
      const converted = creativeLeads.filter((item) => item.leadStatus === LeadStatus.CONVERTED).length;
      return {
        creative: creative.creativeName,
        campaign: creative.campaign.name,
        leads: creativeLeads.length,
        validLeads: creative.validLeadsCount,
        converted,
        validRate:
          creative.leadsCount > 0
            ? Number((creative.validLeadsCount / creative.leadsCount).toFixed(3))
            : 0
      };
    })
  };
}

export async function getRiskStudents(stage?: EnrollmentStage | "ALL") {
  return prisma.student.findMany({
    where: {
      OR: [
        {
          riskLevel: {
            in: [RiskLevel.B, RiskLevel.C]
          }
        },
        {
          riskEvents: {
            some: {}
          }
        }
      ],
      ...(stage && stage !== "ALL"
        ? {
            riskEvents: {
              some: {
                stage
              }
            }
          }
        : {})
    },
    include: {
      cohort: true,
      salesOwner: true,
      deliveryOwner: true,
      riskEvents: {
        ...(stage && stage !== "ALL" ? { where: { stage } } : {}),
        orderBy: { occurredAt: "desc" },
        take: 3
      },
    },
    orderBy: [{ riskLevel: "desc" }, { updatedAt: "desc" }]
  });
}

export async function getRefundWorkbench() {
  return prisma.refundRequest.findMany({
    include: {
      student: {
        include: {
          cohort: true,
          salesOwner: true,
          deliveryOwner: true,
          enrollments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              tailPaymentOwner: true
            }
          }
        }
      },
      currentHandler: true,
      approvals: {
        include: {
          approver: true
        },
        orderBy: [{ decision: "asc" }, { createdAt: "asc" }]
      },
      actions: {
        include: { actor: true },
        orderBy: { actedAt: "desc" }
      }
    },
    orderBy: [{ status: "asc" }, { requestedAt: "desc" }]
  });
}

export async function getSalesFunnelData() {
  const [salesUsers, events, assignments, students, leads] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SALES", active: true }
    }),
    prisma.salesFunnelEvent.findMany(),
    prisma.leadAssignment.findMany(),
    prisma.student.findMany(),
    prisma.lead.findMany()
  ]);

  const stages: FunnelEventType[] = [
    FunnelEventType.LEAD_INTAKE,
    FunnelEventType.ASSIGNED,
    FunnelEventType.ADD_WECHAT,
    FunnelEventType.JOIN_GROUP,
    FunnelEventType.PAY_SEAT_CARD,
    FunnelEventType.PAY_FINAL_PAYMENT,
    FunnelEventType.FORMAL_ENROLLMENT
  ];

  const funnelTotals = stages.map((stage) => ({
    stage: funnelEventLabelMap[stage],
    count:
      stage === FunnelEventType.LEAD_INTAKE
        ? leads.length
        : stage === FunnelEventType.ASSIGNED
          ? assignments.length
          : events.filter((item) => item.eventType === stage).length
  }));

  const bySales = salesUsers.map((user) => {
    const ownerAssignments = assignments.filter((item) => item.assignedToId === user.id);
    const ownerEvents = events.filter((item) => item.ownerId === user.id);
    const ownerStudents = students.filter((item) => item.salesOwnerId === user.id);
    const leadsCount = ownerAssignments.length;
    const responseSamples = ownerAssignments.filter((item) => item.responseMinutes !== null);

    return {
      id: user.id,
      name: user.name,
      leadsCount,
      timeoutCount: ownerAssignments.filter((item) => item.isTimeout).length,
      averageResponseMinutes:
        responseSamples.length > 0
          ? responseSamples.reduce((sum, item) => sum + (item.responseMinutes ?? 0), 0) /
            responseSamples.length
          : 0,
      firstContactRate:
        leadsCount > 0
          ? Number(
              (
                ownerEvents.filter((item) => item.eventType === FunnelEventType.FIRST_CONTACT).length /
                leadsCount
              ).toFixed(3)
            )
          : 0,
      wechatRate:
        leadsCount > 0
          ? Number(
              (
                ownerEvents.filter((item) => item.eventType === FunnelEventType.ADD_WECHAT).length /
                leadsCount
              ).toFixed(3)
            )
          : 0,
      groupRate:
        leadsCount > 0
          ? Number(
              (
                ownerEvents.filter((item) => item.eventType === FunnelEventType.JOIN_GROUP).length /
                leadsCount
              ).toFixed(3)
            )
          : 0,
      seatCardRate:
        leadsCount > 0
          ? Number(
              (
                ownerEvents.filter((item) => item.eventType === FunnelEventType.PAY_SEAT_CARD).length /
                leadsCount
              ).toFixed(3)
            )
          : 0,
      finalPaymentRate:
        leadsCount > 0
          ? Number(
              (
                ownerEvents.filter((item) => item.eventType === FunnelEventType.PAY_FINAL_PAYMENT).length /
                leadsCount
              ).toFixed(3)
            )
          : 0,
      formalRate:
        leadsCount > 0
          ? Number(
              (
                ownerEvents.filter((item) => item.eventType === FunnelEventType.FORMAL_ENROLLMENT).length /
                leadsCount
              ).toFixed(3)
            )
          : 0,
      refundCount: ownerStudents.filter((item) => item.status === StudentStatus.REFUNDED).length
    };
  });

  return {
    funnelTotals,
    bySales,
    helpers: {
      leadStatusLabelMap,
      funnelEventLabelMap
    }
  };
}

export async function getAnalyticsData() {
  const formalStatuses: StudentStatus[] = [
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
  const [cohorts, students, refundRequests, roiStats] = await Promise.all([
    prisma.cohort.findMany({
      orderBy: { startDate: "asc" }
    }),
    prisma.student.findMany({
      include: {
        salesOwner: true,
        deliveryOwner: true,
        cohort: true,
        enrollments: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    }),
    prisma.refundRequest.findMany({
      include: {
        student: {
          include: {
            salesOwner: true,
            deliveryOwner: true,
            cohort: true,
            enrollments: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                tailPaymentOwner: true
              }
            }
          }
        },
        approvals: true
      }
    }),
    prisma.roiPeriodStat.findMany({
      include: { cohort: true }
    })
  ]);

  const bySales = Object.values(
    students.reduce<Record<string, { name: string; grossRevenue: number; refundAmount: number; formalCount: number; refundCount: number }>>((acc, student) => {
      const key = student.salesOwner?.id ?? "unassigned";
      const name = student.salesOwner?.name ?? "未分配销售";
      const refunds = refundRequests.filter((item) => item.student.salesOwnerId === student.salesOwnerId);
      const latestEnrollment = student.enrollments[0];
      const grossRevenue = latestEnrollment ? latestEnrollment.totalReceived : 0;

      if (!acc[key]) {
        acc[key] = {
          name,
          grossRevenue: 0,
          refundAmount: 0,
          formalCount: 0,
          refundCount: 0
        };
      }

      acc[key].grossRevenue += grossRevenue;
      if (formalStatuses.includes(student.status)) {
        acc[key].formalCount += 1;
      }
      acc[key].refundAmount = refunds.reduce((sum, item) => sum + item.refundedAmount, 0);
      acc[key].refundCount = refunds.filter((item) => item.status === RefundStatus.REFUNDED).length;
      return acc;
    }, {})
  );

  const byDelivery = Object.values(
    refundRequests.reduce<Record<string, { name: string; handled: number; refundedAmount: number; retained: number }>>((acc, request) => {
      const key = request.student.deliveryOwner?.id ?? "unassigned";
      const name = request.student.deliveryOwner?.name ?? "未分配交付";
      if (!acc[key]) {
        acc[key] = { name, handled: 0, refundedAmount: 0, retained: 0 };
      }
      acc[key].handled += 1;
      acc[key].refundedAmount += request.refundedAmount;
      if (request.status === RefundStatus.RETAINED) {
        acc[key].retained += 1;
      }
      return acc;
    }, {})
  );

  const byStage = Object.values(
    refundRequests.reduce<Record<string, { stage: string; count: number; refundedAmount: number }>>((acc, request) => {
      const stageName = enrollmentStageLabelMap[request.requestStage];
      if (!acc[stageName]) {
        acc[stageName] = { stage: stageName, count: 0, refundedAmount: 0 };
      }
      acc[stageName].count += 1;
      acc[stageName].refundedAmount += request.refundedAmount;
      return acc;
    }, {})
  );

  const byReason = Object.values(
    refundRequests.reduce<Record<string, { reason: string; count: number; refundedAmount: number }>>((acc, request) => {
      const key = `${request.reasonCategory}-${request.reasonSubcategory}`;
      if (!acc[key]) {
        acc[key] = {
          reason: `${request.reasonCategory} / ${request.reasonSubcategory}`,
          count: 0,
          refundedAmount: 0
        };
      }
      acc[key].count += 1;
      acc[key].refundedAmount += request.refundedAmount;
      return acc;
    }, {})
  );

  const byCohort = cohorts.map((cohort) => {
    const stat = roiStats.find((item) => item.cohortId === cohort.id);
    return {
      cohort: cohort.code,
      grossRevenue: stat?.grossRevenue ?? 0,
      netRevenue: stat?.netRevenue ?? 0,
      grossRoi: stat?.grossRoi ?? 0,
      netRoi: stat?.netRoi ?? 0,
      refundAmount: stat?.refundAmount ?? 0
    };
  });

  return {
    byCohort,
    bySales,
    byDelivery,
    byStage,
    byReason,
    helpers: {
      studentStatusLabelMap,
      riskLevelLabelMap,
      refundLevelLabelMap,
      approvalDecisionLabelMap: {
        [RefundApprovalDecision.PENDING]: "待同意",
        [RefundApprovalDecision.APPROVED]: "已同意",
        [RefundApprovalDecision.REJECTED]: "已拒绝"
      }
    }
  };
}
