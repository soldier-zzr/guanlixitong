import {
  EnrollmentStage,
  FunnelEventType,
  LeadStatus,
  PaymentStatus,
  RefundApprovalDecision,
  RefundStatus,
  RevenueLedgerType,
  RiskLevel,
  StudentStatus,
  type Prisma
} from "@prisma/client";
import { ensureDatabaseReady, prisma } from "@/lib/server/db";
import {
  enrollmentStageLabelMap,
  funnelEventLabelMap,
  leadStatusLabelMap,
  refundLevelLabelMap,
  riskLevelLabelMap,
  studentStatusLabelMap
} from "@/lib/server/config";
import { type DataScope } from "@/lib/server/actor";

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

type AnalyticsFilters = {
  mode?: "COHORT" | "AS_OF_DATE" | "NET_CASH";
  asOfDate?: string;
};

const globalScope: DataScope = {
  isGlobal: true,
  scopeLabel: "全局视角",
  sourceUserIds: [],
  salesUserIds: [],
  deliveryUserIds: []
};

function getScopedLeadWhere(scope: DataScope): Prisma.LeadWhereInput {
  if (scope.isGlobal) {
    return {};
  }

  if (scope.sourceUserIds.length > 0) {
    return {
      sourceOwnerId: {
        in: scope.sourceUserIds
      }
    };
  }

  return {
    currentAssigneeId: {
      in: scope.salesUserIds
    }
  };
}

function getScopedStudentWhere(scope: DataScope): Prisma.StudentWhereInput {
  if (scope.isGlobal) {
    return {};
  }

  const scopedOr: Prisma.StudentWhereInput[] = [];

  if (scope.sourceUserIds.length > 0) {
    scopedOr.push({
      lead: {
        sourceOwnerId: {
          in: scope.sourceUserIds
        }
      }
    });
  }

  if (scope.salesUserIds.length > 0) {
    scopedOr.push({
      salesOwnerId: {
        in: scope.salesUserIds
      }
    });
  }

  if (scope.deliveryUserIds.length > 0) {
    scopedOr.push({
      deliveryOwnerId: {
        in: scope.deliveryUserIds
      }
    });
  }

  if (scopedOr.length === 0) {
    return {
      id: {
        in: []
      }
    };
  }

  return scopedOr.length === 1 ? scopedOr[0] : { OR: scopedOr };
}

function getScopedRefundWhere(scope: DataScope): Prisma.RefundRequestWhereInput {
  if (scope.isGlobal) {
    return {};
  }

  return {
    student: getScopedStudentWhere(scope)
  };
}

function getScopedAssignmentWhere(scope: DataScope): Prisma.LeadAssignmentWhereInput {
  if (scope.isGlobal) {
    return {};
  }

  if (scope.sourceUserIds.length > 0) {
    return {
      lead: {
        sourceOwnerId: {
          in: scope.sourceUserIds
        }
      }
    };
  }

  return {
    assignedToId: {
      in: scope.salesUserIds
    }
  };
}

function getScopedRevenueLedgerWhere(scope: DataScope): Prisma.RevenueLedgerWhereInput {
  if (scope.isGlobal) {
    return {};
  }

  return {
    student: getScopedStudentWhere(scope)
  };
}

function getScopedFunnelEventWhere(scope: DataScope): Prisma.SalesFunnelEventWhereInput {
  if (scope.isGlobal) {
    return {};
  }

  if (scope.sourceUserIds.length > 0) {
    return {
      OR: [
        {
          lead: {
            sourceOwnerId: {
              in: scope.sourceUserIds
            }
          }
        },
        {
          student: {
            lead: {
              sourceOwnerId: {
                in: scope.sourceUserIds
              }
            }
          }
        }
      ]
    };
  }

  return {
    ownerId: {
      in: scope.salesUserIds
    }
  };
}

export async function getLookupOptions() {
  await ensureDatabaseReady();
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

export async function getDashboardData(scope: DataScope = globalScope) {
  await ensureDatabaseReady();
  const studentWhere = getScopedStudentWhere(scope);
  const leadWhere = getScopedLeadWhere(scope);
  const refundWhere = getScopedRefundWhere(scope);
  const assignmentWhere = getScopedAssignmentWhere(scope);
  const funnelWhere = getScopedFunnelEventWhere(scope);

  const [students, cohorts, refundRequests, leads, allLeads, assignments, funnelEvents, ledgers] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere,
      include: {
        cohort: true,
        riskEvents: true,
        enrollments: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    }),
    prisma.cohort.findMany({
      orderBy: { startDate: "asc" }
    }),
    prisma.refundRequest.findMany({
      where: refundWhere,
      include: {
        student: {
          select: {
            cohortId: true
          }
        }
      }
    }),
    prisma.lead.findMany({
      where: leadWhere,
      include: {
        campaign: true
      }
    }),
    prisma.lead.findMany({
      include: {
        campaign: true
      }
    }),
    prisma.leadAssignment.findMany({
      where: assignmentWhere
    }),
    prisma.salesFunnelEvent.findMany({
      where: funnelWhere
    }),
    prisma.revenueLedger.findMany({
      where: getScopedRevenueLedgerWhere(scope)
    })
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

  const grossRevenue = ledgers
    .filter((item) =>
      item.ledgerType === RevenueLedgerType.SEAT_CARD_RECEIPT ||
      item.ledgerType === RevenueLedgerType.FINAL_PAYMENT_RECEIPT
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const refundAmount = ledgers
    .filter((item) => item.ledgerType === RevenueLedgerType.REFUND_OUTFLOW)
    .reduce((sum, item) => sum + item.amount, 0);
  const netRevenue = grossRevenue - refundAmount;
  const adSpend = leads.reduce((sum, lead) => {
    const campaignSpent = lead.campaign?.spentAmount ?? 0;
    if (!lead.campaignId || campaignSpent === 0) {
      return sum;
    }

    const totalCampaignLeads = allLeads.filter((item) => item.campaignId === lead.campaignId).length || 1;
    return sum + campaignSpent / totalCampaignLeads;
  }, 0);

  const grossRoi = adSpend > 0 ? grossRevenue / adSpend : 0;
  const netRoi = adSpend > 0 ? netRevenue / adSpend : 0;

  const riskDistribution = [
    { name: riskLevelLabelMap.A, value: students.filter((item) => item.riskLevel === RiskLevel.A).length },
    { name: riskLevelLabelMap.B, value: students.filter((item) => item.riskLevel === RiskLevel.B).length },
    { name: riskLevelLabelMap.C, value: students.filter((item) => item.riskLevel === RiskLevel.C).length }
  ];

  const cohortStats = cohorts.map((cohort) => {
    const cohortStudents = students.filter((item) => item.cohortId === cohort.id);
    const cohortRefunds = refundRequests.filter((item) => item.student.cohortId === cohort.id);
    const cohortGrossRevenue = ledgers
      .filter(
        (item) =>
          item.cohortId === cohort.id &&
          (item.ledgerType === RevenueLedgerType.SEAT_CARD_RECEIPT ||
            item.ledgerType === RevenueLedgerType.FINAL_PAYMENT_RECEIPT)
      )
      .reduce((sum, item) => sum + item.amount, 0);
    const cohortRefundAmount = ledgers
      .filter((item) => item.cohortId === cohort.id && item.ledgerType === RevenueLedgerType.REFUND_OUTFLOW)
      .reduce((sum, item) => sum + item.amount, 0);
    const cohortNetRevenue = cohortGrossRevenue - cohortRefundAmount;
    const cohortLeadIds = new Set(
      leads.filter((lead) =>
        cohortStudents.some((student) => student.leadId === lead.id)
      ).map((lead) => lead.id)
    );
    const cohortAdSpend = allLeads.reduce((sum, lead) => {
      if (!lead.campaignId || !cohortLeadIds.has(lead.id)) {
        return sum;
      }

      const totalCampaignLeads = allLeads.filter((item) => item.campaignId === lead.campaignId).length || 1;
      return sum + (lead.campaign?.spentAmount ?? 0) / totalCampaignLeads;
    }, 0);

    return {
      cohortId: cohort.id,
      cohort,
      grossRevenue: cohortGrossRevenue,
      netRevenue: cohortNetRevenue,
      refundAmount: cohortRefundAmount,
      refundCount: cohortRefunds.filter((item) => item.status === RefundStatus.REFUNDED).length,
      warningCount: cohortStudents.filter((item) => item.riskLevel !== RiskLevel.A).length,
      studentCount: cohortStudents.length,
      grossRoi: cohortAdSpend > 0 ? cohortGrossRevenue / cohortAdSpend : 0,
      netRoi: cohortAdSpend > 0 ? cohortNetRevenue / cohortAdSpend : 0
    };
  });

  const refundTrend = cohorts.map((cohort) => {
    const stat = cohortStats.find((item) => item.cohortId === cohort.id);

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
    cohortStats,
    scopeLabel: scope.scopeLabel
  };
}

export async function getStudents(filters: StudentFilters = {}, scope: DataScope = globalScope) {
  await ensureDatabaseReady();
  const andConditions: Prisma.StudentWhereInput[] = [];
  const scopedWhere = getScopedStudentWhere(scope);

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
          AND: [scopedWhere, ...andConditions]
        }
      : scopedWhere;

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

export async function getStudentDetail(studentId: string, scope: DataScope = globalScope) {
  await ensureDatabaseReady();
  return prisma.student.findFirst({
    where: {
      AND: [{ id: studentId }, getScopedStudentWhere(scope)]
    },
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

export async function getLeads(filters: LeadFilters = {}, scope: DataScope = globalScope) {
  await ensureDatabaseReady();
  const andConditions: Prisma.LeadWhereInput[] = [];
  const scopedWhere = getScopedLeadWhere(scope);

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

  const where: Prisma.LeadWhereInput =
    andConditions.length > 0 ? { AND: [scopedWhere, ...andConditions] } : scopedWhere;

  return prisma.lead.findMany({
    where,
    include: {
      campaign: true,
      creative: true,
      sourceOwner: true,
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

export async function getLeadOverview(scope: DataScope = globalScope) {
  await ensureDatabaseReady();
  const scopedLeadWhere = getScopedLeadWhere(scope);
  const scopedAssignmentWhere = getScopedAssignmentWhere(scope);
  const [leads, campaigns, creatives, assignments] = await Promise.all([
    prisma.lead.findMany({
      where: scopedLeadWhere,
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
    prisma.leadAssignment.findMany({
      where: scopedAssignmentWhere
    })
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

export async function getRiskStudents(
  stage: EnrollmentStage | "ALL" = "ALL",
  scope: DataScope = globalScope
) {
  await ensureDatabaseReady();
  const students = await prisma.student.findMany({
    where: {
      AND: [getScopedStudentWhere(scope)],
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
      lead: {
        include: {
          assignments: {
            orderBy: { assignedAt: "desc" },
            take: 1
          }
        }
      },
      enrollments: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      riskEvents: {
        ...(stage && stage !== "ALL" ? { where: { stage } } : {}),
        orderBy: { occurredAt: "desc" },
        take: 3
      },
    },
    orderBy: [{ riskLevel: "desc" }, { updatedAt: "desc" }]
  });

  return students.map((student) => {
    const latestAssignment = student.lead?.assignments[0];
    const latestEnrollment = student.enrollments[0];
    const autoSignals: Array<{ label: string; stage: EnrollmentStage; note: string }> = [];

    if (latestAssignment?.isTimeout) {
      autoSignals.push({
        label: "自动预警：首响超时",
        stage: EnrollmentStage.WECHAT,
        note: "线索已分配，但首次联系超过 SLA。"
      });
    }

    if (
      student.lead?.currentAssigneeId &&
      student.lead.leadStatus === LeadStatus.ASSIGNED
    ) {
      autoSignals.push({
        label: "自动预警：已分配未跟进",
        stage: EnrollmentStage.WECHAT,
        note: "线索已分配，但当前仍停留在已分配状态。"
      });
    }

    if (
      latestEnrollment?.seatCardStatus === PaymentStatus.PAID &&
      latestEnrollment.finalPaymentStatus !== PaymentStatus.PAID
    ) {
      autoSignals.push({
        label: "自动预警：已占位未补尾款",
        stage: EnrollmentStage.FINAL_PAYMENT,
        note: "占位卡已支付，但尾款仍未完成。"
      });
    }

    if (
      latestEnrollment?.handoffToDeliveryAt &&
      student.status !== StudentStatus.RETAINED &&
      student.status !== StudentStatus.REFUNDED &&
      student.status !== StudentStatus.CLOSED
    ) {
      autoSignals.push({
        label: "自动预警：转交交付后待承接",
        stage: EnrollmentStage.PRE_START,
        note: "已转交交付，需重点确认承接动作与稳定度。"
      });
    }

    return {
      ...student,
      automaticSignals: autoSignals
    };
  });
}

export async function getRefundWorkbench(scope: DataScope = globalScope) {
  await ensureDatabaseReady();
  return prisma.refundRequest.findMany({
    where: getScopedRefundWhere(scope),
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

export async function getSalesFunnelData(scope: DataScope = globalScope) {
  await ensureDatabaseReady();
  const [salesUsers, events, assignments, students, leads] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: "SALES",
        active: true,
        ...(scope.isGlobal
          ? {}
          : {
              id: {
                in: scope.salesUserIds
              }
            })
      }
    }),
    prisma.salesFunnelEvent.findMany({
      where: getScopedFunnelEventWhere(scope)
    }),
    prisma.leadAssignment.findMany({
      where: getScopedAssignmentWhere(scope)
    }),
    prisma.student.findMany({
      where: getScopedStudentWhere(scope)
    }),
    prisma.lead.findMany({
      where: getScopedLeadWhere(scope)
    })
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
    scopeLabel: scope.scopeLabel,
    helpers: {
      leadStatusLabelMap,
      funnelEventLabelMap
    }
  };
}

export async function getAnalyticsData(
  scope: DataScope = globalScope,
  filters: AnalyticsFilters = {}
) {
  await ensureDatabaseReady();
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
  const mode = filters.mode ?? "COHORT";
  const asOfDate = filters.asOfDate ? new Date(filters.asOfDate) : new Date();
  const [cohorts, students, refundRequests, roiStats, ledgers] = await Promise.all([
    prisma.cohort.findMany({
      orderBy: { startDate: "asc" }
    }),
    prisma.student.findMany({
      where: getScopedStudentWhere(scope),
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
      where: getScopedRefundWhere(scope),
      include: {
        createdBy: true,
        currentHandler: true,
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
        approvals: {
          include: {
            approver: true
          }
        }
      }
    }),
    prisma.roiPeriodStat.findMany({
      include: { cohort: true }
    }),
    prisma.revenueLedger.findMany({
      where: {
        ...getScopedRevenueLedgerWhere(scope),
        ...(mode === "AS_OF_DATE"
          ? {
              occurredAt: {
                lte: asOfDate
              }
            }
          : {})
      }
    })
  ]);

  const visibleLedgers =
    mode === "NET_CASH"
      ? ledgers.filter(
          (item) =>
            item.ledgerType === RevenueLedgerType.SEAT_CARD_RECEIPT ||
            item.ledgerType === RevenueLedgerType.FINAL_PAYMENT_RECEIPT ||
            item.ledgerType === RevenueLedgerType.REFUND_OUTFLOW
        )
      : ledgers;

  const bySales = Object.values(
    students.reduce<Record<string, { name: string; grossRevenue: number; refundAmount: number; formalCount: number; refundCount: number }>>((acc, student) => {
      const key = student.salesOwner?.id ?? "unassigned";
      const name = student.salesOwner?.name ?? "未分配销售";
      const refunds = refundRequests.filter((item) => item.student.salesOwnerId === student.salesOwnerId);
      const grossRevenue = visibleLedgers
        .filter(
          (item) =>
            item.studentId === student.id &&
            (item.ledgerType === RevenueLedgerType.SEAT_CARD_RECEIPT ||
              item.ledgerType === RevenueLedgerType.FINAL_PAYMENT_RECEIPT ||
              item.ledgerType === RevenueLedgerType.RECOGNIZED_REVENUE)
        )
        .reduce((sum, item) => sum + item.amount, 0);

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

  const byResponsibility = Object.values(
    refundRequests.reduce<
      Record<string, { name: string; role: string; handled: number; approved: number; refundedAmount: number }>
    >((acc, request) => {
      const actors = [
        request.createdBy ? { key: `created-${request.createdBy.id}`, name: request.createdBy.name, role: "发起退款" } : null,
        request.currentHandler ? { key: `handle-${request.currentHandler.id}`, name: request.currentHandler.name, role: "当前处理人" } : null,
        ...request.approvals.map((approval) => ({
          key: `approval-${approval.approver.id}`,
          name: approval.approver.name,
          role: "审批人",
          approved: approval.decision === RefundApprovalDecision.APPROVED ? 1 : 0
        }))
      ].filter(Boolean) as Array<{ key: string; name: string; role: string; approved?: number }>;

      for (const actor of actors) {
        if (!acc[actor.key]) {
          acc[actor.key] = {
            name: actor.name,
            role: actor.role,
            handled: 0,
            approved: 0,
            refundedAmount: 0
          };
        }
        acc[actor.key].handled += 1;
        acc[actor.key].approved += actor.approved ?? 0;
        acc[actor.key].refundedAmount += request.refundedAmount;
      }

      return acc;
    }, {})
  );

  const byCohort = cohorts.map((cohort) => {
    const stat = roiStats.find((item) => item.cohortId === cohort.id);
    const cohortGrossRevenue = visibleLedgers
      .filter(
        (item) =>
          item.cohortId === cohort.id &&
          (mode === "NET_CASH"
            ? item.ledgerType === RevenueLedgerType.SEAT_CARD_RECEIPT ||
              item.ledgerType === RevenueLedgerType.FINAL_PAYMENT_RECEIPT
            : item.ledgerType === RevenueLedgerType.SEAT_CARD_RECEIPT ||
              item.ledgerType === RevenueLedgerType.FINAL_PAYMENT_RECEIPT ||
              item.ledgerType === RevenueLedgerType.RECOGNIZED_REVENUE)
      )
      .reduce((sum, item) => sum + item.amount, 0);
    const cohortRefundAmount = visibleLedgers
      .filter((item) => item.cohortId === cohort.id && item.ledgerType === RevenueLedgerType.REFUND_OUTFLOW)
      .reduce((sum, item) => sum + item.amount, 0);
    const cohortNetRevenue = cohortGrossRevenue - cohortRefundAmount;
    const grossRoi = cohort.adSpend > 0 ? cohortGrossRevenue / cohort.adSpend : 0;
    const netRoi = cohort.adSpend > 0 ? cohortNetRevenue / cohort.adSpend : 0;

    return {
      cohort: cohort.code,
      grossRevenue: cohortGrossRevenue || stat?.grossRevenue || 0,
      netRevenue: cohortNetRevenue || stat?.netRevenue || 0,
      grossRoi: grossRoi || stat?.grossRoi || 0,
      netRoi: netRoi || stat?.netRoi || 0,
      refundAmount: cohortRefundAmount || stat?.refundAmount || 0
    };
  });

  return {
    byCohort,
    bySales,
    byDelivery,
    byStage,
    byReason,
    byResponsibility,
    mode,
    asOfDate: asOfDate.toISOString(),
    scopeLabel: scope.scopeLabel,
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

export async function getMarketingCollaborationRows(scope: DataScope = globalScope) {
  await ensureDatabaseReady();
  return prisma.lead.findMany({
    where: getScopedLeadWhere(scope),
    include: {
      sourceOwner: true,
      currentAssignee: true,
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
      }
    },
    orderBy: [{ sourceTime: "desc" }]
  });
}
