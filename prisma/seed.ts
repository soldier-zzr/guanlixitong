import {
  AssignmentResult,
  EnrollmentStage,
  FunnelEventType,
  LeadStatus,
  PaymentStatus,
  RefundActionType,
  RefundApprovalDecision,
  RefundLevel,
  RefundStatus,
  RiskLevel,
  StudentStatus,
  UserTitle,
  UserRole
} from "@prisma/client";
import { prisma } from "../lib/server/db";
import { recalculateAllCohortStats } from "../lib/server/recompute";
import { refundReasonCatalog, riskSignalCatalog } from "../lib/server/config";

function daysAgo(days: number, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  await prisma.salesFunnelEvent.deleteMany();
  await prisma.leadAssignment.deleteMany();
  await prisma.refundAction.deleteMany();
  await prisma.refundApproval.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.riskEvent.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.adCreative.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.roiPeriodStat.deleteMany();
  await prisma.dictionary.deleteMany();
  await prisma.cohort.deleteMany();
  await prisma.user.deleteMany();

  for (const signal of riskSignalCatalog) {
    await prisma.dictionary.create({
      data: {
        type: "risk_signal",
        code: signal.code,
        label: signal.label,
        sortOrder: signal.severity,
        extraJson: JSON.stringify({ severity: signal.severity })
      }
    });
  }

  let order = 1;
  for (const reason of refundReasonCatalog) {
    await prisma.dictionary.create({
      data: {
        type: "refund_reason_l1",
        code: reason.code,
        label: reason.label,
        sortOrder: order
      }
    });

    for (const child of reason.children) {
      await prisma.dictionary.create({
        data: {
          type: "refund_reason_l2",
          code: `${reason.code}_${order}`,
          label: child,
          parentCode: reason.code,
          sortOrder: order
        }
      });
      order += 1;
    }
    order += 1;
  }

  for (const [code, label] of Object.entries({
    LOW_PRICE_PURCHASED: "已购低价课",
    WECHAT_ADDED: "已加企微",
    IN_GROUP_LEARNING: "已进群/已学习",
    SEAT_CARD_PAID: "已拍占位卡",
    FINAL_PAYMENT_PENDING: "待补尾款",
    FORMALLY_ENROLLED: "已正式报名",
    PRE_START_OBSERVING: "开课前观察中",
    REFUND_WARNING: "已出现退款预警",
    REFUND_REQUESTED: "已明确提出退款",
    LEVEL1_PROCESSING: "一级处理中",
    LEVEL2_PROCESSING: "二级处理中",
    LEVEL3_PROCESSING: "三级处理中",
    RETAINED: "已挽回",
    REFUNDED: "已退款",
    CLOSED: "已结案"
  })) {
    await prisma.dictionary.create({
      data: {
        type: "student_status",
        code,
        label,
        sortOrder: 100
      }
    });
  }

  const admin = await prisma.user.create({
    data: { name: "韩总", role: UserRole.ADMIN, title: UserTitle.ADMIN, email: "admin@example.com" }
  });
  const salesManagerA = await prisma.user.create({
    data: {
      name: "郑强",
      role: UserRole.SUPERVISOR,
      title: UserTitle.SALES_MANAGER,
      email: "zhengqiang@example.com"
    }
  });
  const salesManagerB = await prisma.user.create({
    data: {
      name: "靳康",
      role: UserRole.SUPERVISOR,
      title: UserTitle.SALES_MANAGER,
      email: "jikang@example.com"
    }
  });
  const deliveryManager = await prisma.user.create({
    data: {
      name: "王子阳",
      role: UserRole.SUPERVISOR,
      title: UserTitle.DELIVERY_SUPERVISOR,
      email: "wangziyang@example.com"
    }
  });
  const salesA = await prisma.user.create({
    data: {
      name: "汪久渝",
      role: UserRole.SALES,
      title: UserTitle.SALES,
      email: "wangjiuyu@example.com",
      managerId: salesManagerB.id
    }
  });
  const salesB = await prisma.user.create({
    data: {
      name: "郭凤娇",
      role: UserRole.SALES,
      title: UserTitle.SALES,
      email: "guofengjiao@example.com",
      managerId: salesManagerB.id
    }
  });
  const salesC = await prisma.user.create({
    data: {
      name: "马晓静",
      role: UserRole.SALES,
      title: UserTitle.SALES,
      email: "maxiaojing@example.com",
      managerId: salesManagerB.id
    }
  });
  const salesD = await prisma.user.create({
    data: {
      name: "王磊",
      role: UserRole.SALES,
      title: UserTitle.SALES,
      email: "wanglei@example.com",
      managerId: salesManagerA.id
    }
  });
  const salesE = await prisma.user.create({
    data: {
      name: "王超",
      role: UserRole.SALES,
      title: UserTitle.SALES,
      email: "wangchao@example.com",
      managerId: salesManagerA.id
    }
  });
  const deliveryA = await prisma.user.create({
    data: {
      name: "阿柠",
      role: UserRole.DELIVERY,
      title: UserTitle.DELIVERY_OPS,
      email: "aning@example.com",
      managerId: deliveryManager.id
    }
  });
  const deliveryB = await prisma.user.create({
    data: {
      name: "阿杜",
      role: UserRole.DELIVERY,
      title: UserTitle.DELIVERY_OPS,
      email: "adu@example.com",
      managerId: deliveryManager.id
    }
  });

  const users = [
    admin,
    salesManagerA,
    salesManagerB,
    deliveryManager,
    salesA,
    salesB,
    salesC,
    salesD,
    salesE,
    deliveryA,
    deliveryB
  ];
  const supervisor = deliveryManager;

  const campaigns = await Promise.all([
    prisma.campaign.create({
      data: {
        name: "3月短视频投放 A 计划",
        channel: "短视频投流",
        platform: "抖音",
        materialType: "口播转化",
        ownerId: admin.id,
        budget: 60000,
        spentAmount: 52800,
        startAt: daysAgo(25),
        endAt: daysAgo(5)
      }
    }),
    prisma.campaign.create({
      data: {
        name: "直播间引流 D 计划",
        channel: "直播投流",
        platform: "抖音",
        materialType: "直播切片",
        ownerId: admin.id,
        budget: 72000,
        spentAmount: 66800,
        startAt: daysAgo(20),
        endAt: daysAgo(1)
      }
    }),
    prisma.campaign.create({
      data: {
        name: "私域裂变补量计划",
        channel: "私域裂变",
        platform: "企微私域",
        materialType: "老带新",
        ownerId: admin.id,
        budget: 18000,
        spentAmount: 12000,
        startAt: daysAgo(14)
      }
    })
  ]);

  const creatives = await Promise.all([
    prisma.adCreative.create({
      data: {
        campaignId: campaigns[0].id,
        creativeName: "账号起号避坑口播",
        creativeCode: "CR-A-001",
        themeTag: "起号",
        publishAt: daysAgo(24),
        impressions: 280000,
        clicks: 7800,
        leadsCount: 66,
        validLeadsCount: 42
      }
    }),
    prisma.adCreative.create({
      data: {
        campaignId: campaigns[0].id,
        creativeName: "素人转化案例拆解",
        creativeCode: "CR-A-002",
        themeTag: "案例",
        publishAt: daysAgo(23),
        impressions: 196000,
        clicks: 5200,
        leadsCount: 44,
        validLeadsCount: 25
      }
    }),
    prisma.adCreative.create({
      data: {
        campaignId: campaigns[1].id,
        creativeName: "直播间限时福利切片",
        creativeCode: "CR-D-001",
        themeTag: "直播福利",
        publishAt: daysAgo(18),
        impressions: 330000,
        clicks: 9600,
        leadsCount: 74,
        validLeadsCount: 41
      }
    }),
    prisma.adCreative.create({
      data: {
        campaignId: campaigns[1].id,
        creativeName: "学员逆袭证言切片",
        creativeCode: "CR-D-002",
        themeTag: "证言",
        publishAt: daysAgo(17),
        impressions: 248000,
        clicks: 6100,
        leadsCount: 39,
        validLeadsCount: 19
      }
    }),
    prisma.adCreative.create({
      data: {
        campaignId: campaigns[2].id,
        creativeName: "群内转介绍海报",
        creativeCode: "CR-P-001",
        themeTag: "转介绍",
        publishAt: daysAgo(10),
        impressions: 52000,
        clicks: 1800,
        leadsCount: 21,
        validLeadsCount: 12
      }
    })
  ]);

  const cohorts = await Promise.all([
    prisma.cohort.create({
      data: {
        code: "起盘营2期",
        name: "起盘营2期",
        courseVersion: "密训2.0",
        startDate: daysAgo(35),
        endDate: daysAgo(5),
        adSpend: 78000,
        targetRevenue: 198000
      }
    }),
    prisma.cohort.create({
      data: {
        code: "起盘营3期",
        name: "起盘营3期",
        courseVersion: "密训2.0",
        startDate: daysAgo(14),
        endDate: daysAgo(1),
        adSpend: 92000,
        targetRevenue: 260000
      }
    }),
    prisma.cohort.create({
      data: {
        code: "起盘营4期",
        name: "起盘营4期",
        courseVersion: "密训2.0",
        startDate: daysAgo(-7),
        adSpend: 108000,
        targetRevenue: 320000
      }
    })
  ]);

  const profiles = [
    {
      name: "林悦",
      phone: "13800010001",
      city: "上海",
      sourceCampaign: "短视频 A 组",
      campaignId: campaigns[0].id,
      creativeId: creatives[0].id,
      cohort: cohorts[1],
      salesOwnerId: salesD.id,
      deliveryOwnerId: deliveryA.id,
      seatCardAmount: 980,
      finalPaymentAmount: 6000,
      seatCardStatus: PaymentStatus.PAID,
      finalPaymentStatus: PaymentStatus.PAID,
      formallyEnrolledAt: daysAgo(9),
      observationStartedAt: daysAgo(5),
      riskLevel: RiskLevel.A,
      status: StudentStatus.PRE_START_OBSERVING
    },
    {
      name: "宋岚",
      phone: "13800010002",
      city: "杭州",
      sourceCampaign: "短视频 A 组",
      campaignId: campaigns[0].id,
      creativeId: creatives[1].id,
      cohort: cohorts[2],
      salesOwnerId: salesE.id,
      deliveryOwnerId: deliveryA.id,
      seatCardAmount: 980,
      finalPaymentAmount: 0,
      seatCardStatus: PaymentStatus.PAID,
      finalPaymentStatus: PaymentStatus.NOT_STARTED,
      riskLevel: RiskLevel.B,
      status: StudentStatus.FINAL_PAYMENT_PENDING
    },
    {
      name: "顾然",
      phone: "13800010003",
      city: "南京",
      sourceCampaign: "直播间 D 组",
      campaignId: campaigns[1].id,
      creativeId: creatives[2].id,
      cohort: cohorts[2],
      salesOwnerId: salesB.id,
      deliveryOwnerId: deliveryB.id,
      seatCardAmount: 980,
      finalPaymentAmount: 6000,
      seatCardStatus: PaymentStatus.PAID,
      finalPaymentStatus: PaymentStatus.PAID,
      formallyEnrolledAt: daysAgo(3),
      observationStartedAt: daysAgo(1),
      riskLevel: RiskLevel.C,
      status: StudentStatus.LEVEL2_PROCESSING
    },
    {
      name: "徐萌",
      phone: "13800010004",
      city: "苏州",
      sourceCampaign: "私域转介绍",
      campaignId: campaigns[2].id,
      creativeId: creatives[4].id,
      cohort: cohorts[2],
      salesOwnerId: salesC.id,
      deliveryOwnerId: deliveryB.id,
      seatCardAmount: 980,
      finalPaymentAmount: 6000,
      seatCardStatus: PaymentStatus.PAID,
      finalPaymentStatus: PaymentStatus.PAID,
      formallyEnrolledAt: daysAgo(4),
      observationStartedAt: daysAgo(1),
      riskLevel: RiskLevel.B,
      status: StudentStatus.RETAINED
    },
    {
      name: "郑安",
      phone: "13800010005",
      city: "武汉",
      sourceCampaign: "短视频 B 组",
      campaignId: campaigns[0].id,
      creativeId: creatives[0].id,
      cohort: cohorts[1],
      salesOwnerId: salesD.id,
      deliveryOwnerId: deliveryB.id,
      seatCardAmount: 980,
      finalPaymentAmount: 6000,
      seatCardStatus: PaymentStatus.REFUNDED,
      finalPaymentStatus: PaymentStatus.REFUNDED,
      formallyEnrolledAt: daysAgo(11),
      observationStartedAt: daysAgo(8),
      riskLevel: RiskLevel.C,
      status: StudentStatus.REFUNDED
    },
    {
      name: "罗琪",
      phone: "13800010006",
      city: "成都",
      sourceCampaign: "直播投流 C 组",
      campaignId: campaigns[1].id,
      creativeId: creatives[3].id,
      cohort: cohorts[1],
      salesOwnerId: salesE.id,
      deliveryOwnerId: deliveryA.id,
      seatCardAmount: 980,
      finalPaymentAmount: 6000,
      seatCardStatus: PaymentStatus.PAID,
      finalPaymentStatus: PaymentStatus.PAID,
      formallyEnrolledAt: daysAgo(12),
      observationStartedAt: daysAgo(7),
      riskLevel: RiskLevel.C,
      status: StudentStatus.LEVEL3_PROCESSING
    },
    {
      name: "沈念",
      phone: "13800010007",
      city: "北京",
      sourceCampaign: "短视频 B 组",
      campaignId: campaigns[0].id,
      creativeId: creatives[1].id,
      cohort: cohorts[0],
      salesOwnerId: salesD.id,
      deliveryOwnerId: deliveryA.id,
      seatCardAmount: 980,
      finalPaymentAmount: 6000,
      seatCardStatus: PaymentStatus.PAID,
      finalPaymentStatus: PaymentStatus.PAID,
      formallyEnrolledAt: daysAgo(30),
      observationStartedAt: daysAgo(27),
      riskLevel: RiskLevel.A,
      status: StudentStatus.CLOSED
    },
    {
      name: "许禾",
      phone: "13800010008",
      city: "深圳",
      sourceCampaign: "投流训练营",
      campaignId: campaigns[1].id,
      creativeId: creatives[2].id,
      cohort: cohorts[2],
      salesOwnerId: salesA.id,
      deliveryOwnerId: deliveryB.id,
      seatCardAmount: 980,
      finalPaymentAmount: 6000,
      seatCardStatus: PaymentStatus.PAID,
      finalPaymentStatus: PaymentStatus.NOT_STARTED,
      riskLevel: RiskLevel.C,
      status: StudentStatus.REFUND_WARNING
    },
    {
      name: "祁安",
      phone: "13800010009",
      city: "广州",
      sourceCampaign: "短视频 A 组",
      campaignId: campaigns[0].id,
      creativeId: creatives[0].id,
      cohort: cohorts[0],
      salesOwnerId: salesB.id,
      deliveryOwnerId: deliveryB.id,
      seatCardAmount: 980,
      finalPaymentAmount: 6000,
      seatCardStatus: PaymentStatus.PAID,
      finalPaymentStatus: PaymentStatus.PAID,
      formallyEnrolledAt: daysAgo(28),
      observationStartedAt: daysAgo(26),
      riskLevel: RiskLevel.B,
      status: StudentStatus.RETAINED
    },
    {
      name: "江遥",
      phone: "13800010010",
      city: "天津",
      sourceCampaign: "私域裂变",
      campaignId: campaigns[2].id,
      creativeId: creatives[4].id,
      cohort: cohorts[2],
      salesOwnerId: salesC.id,
      deliveryOwnerId: deliveryA.id,
      seatCardAmount: 0,
      finalPaymentAmount: 0,
      seatCardStatus: PaymentStatus.NOT_STARTED,
      finalPaymentStatus: PaymentStatus.NOT_STARTED,
      riskLevel: RiskLevel.A,
      status: StudentStatus.IN_GROUP_LEARNING
    },
    {
      name: "唐音",
      phone: "13800010011",
      city: "青岛",
      sourceCampaign: "公开课私聊",
      campaignId: campaigns[1].id,
      creativeId: creatives[3].id,
      cohort: cohorts[1],
      salesOwnerId: salesA.id,
      deliveryOwnerId: deliveryA.id,
      seatCardAmount: 980,
      finalPaymentAmount: 6000,
      seatCardStatus: PaymentStatus.PAID,
      finalPaymentStatus: PaymentStatus.PAID,
      formallyEnrolledAt: daysAgo(10),
      observationStartedAt: daysAgo(6),
      riskLevel: RiskLevel.B,
      status: StudentStatus.LEVEL1_PROCESSING
    },
    {
      name: "毕夏",
      phone: "13800010012",
      city: "合肥",
      sourceCampaign: "直播间 D 组",
      campaignId: campaigns[1].id,
      creativeId: creatives[2].id,
      cohort: cohorts[1],
      salesOwnerId: salesE.id,
      deliveryOwnerId: deliveryB.id,
      seatCardAmount: 980,
      finalPaymentAmount: 0,
      seatCardStatus: PaymentStatus.PAID,
      finalPaymentStatus: PaymentStatus.NOT_STARTED,
      riskLevel: RiskLevel.B,
      status: StudentStatus.REFUND_WARNING
    }
  ];

  const leads = [];
  for (const [index, profile] of profiles.entries()) {
    const lead = await prisma.lead.create({
      data: {
        name: profile.name,
        phone: profile.phone,
        city: profile.city,
        sourceTime: daysAgo(16 - index, 9),
        intentLevel: index % 3 === 0 ? "高意向" : index % 3 === 1 ? "中意向" : "低意向",
        qualityScore: 66 + ((index * 5) % 25),
        leadStatus:
          profile.status === StudentStatus.IN_GROUP_LEARNING
            ? LeadStatus.IN_GROUP
            : profile.status === StudentStatus.FINAL_PAYMENT_PENDING
              ? LeadStatus.IN_GROUP
              : LeadStatus.CONVERTED,
        note: "seed 线索",
        campaignId: profile.campaignId,
        creativeId: profile.creativeId,
        currentAssigneeId: profile.salesOwnerId
      }
    });

    leads.push(lead);

    await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToId: profile.salesOwnerId,
        assignedAt: daysAgo(16 - index, 9),
        acceptedAt: daysAgo(16 - index, 9),
        firstContactAt: daysAgo(16 - index, index % 2 === 0 ? 10 : 13),
        responseMinutes: index % 4 === 0 ? 18 : index % 4 === 1 ? 42 : 95,
        isTimeout: index % 4 === 2,
        result:
          profile.status === StudentStatus.IN_GROUP_LEARNING
            ? AssignmentResult.CONTACTED
            : AssignmentResult.CONVERTED,
        note: "首次分配"
      }
    });
  }

  const extraLeadBlueprints = [
    ["韩朵", "13800010021", "重庆", campaigns[0].id, creatives[1].id, salesA.id, LeadStatus.ASSIGNED, AssignmentResult.PENDING, 72],
    ["白序", "13800010022", "西安", campaigns[1].id, creatives[2].id, salesB.id, LeadStatus.CONTACTED, AssignmentResult.NO_RESPONSE, 54],
    ["严歌", "13800010023", "宁波", campaigns[1].id, creatives[3].id, salesC.id, LeadStatus.WECHAT_ADDED, AssignmentResult.CONTACTED, 79],
    ["黎原", "13800010024", "长沙", campaigns[2].id, creatives[4].id, salesD.id, LeadStatus.NEW, AssignmentResult.PENDING, 61],
    ["姜淼", "13800010025", "无锡", campaigns[0].id, creatives[0].id, salesE.id, LeadStatus.LOST, AssignmentResult.LOST, 43],
    ["陶沐", "13800010026", "郑州", campaigns[1].id, creatives[2].id, salesA.id, LeadStatus.ASSIGNED, AssignmentResult.ACCEPTED, 68]
  ] as const;

  for (const [index, item] of extraLeadBlueprints.entries()) {
    const lead = await prisma.lead.create({
      data: {
        name: item[0],
        phone: item[1],
        city: item[2],
        sourceTime: daysAgo(6 - index, 11),
        intentLevel: index % 2 === 0 ? "中意向" : "低意向",
        qualityScore: item[8],
        leadStatus: item[6],
        note: "未转学员线索",
        campaignId: item[3],
        creativeId: item[4],
        currentAssigneeId: item[5]
      }
    });

    await prisma.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToId: item[5],
        assignedAt: daysAgo(6 - index, 11),
        acceptedAt: item[7] === AssignmentResult.PENDING ? null : daysAgo(6 - index, 11),
        firstContactAt:
          item[7] === AssignmentResult.CONTACTED || item[7] === AssignmentResult.NO_RESPONSE
            ? daysAgo(6 - index, 14)
            : null,
        responseMinutes: item[7] === AssignmentResult.PENDING ? null : 130 - index * 12,
        isTimeout: index % 2 === 0,
        result: item[7],
        note: "扩展线索"
      }
    });
  }

  const students = [];
  const enrollmentMap = new Map<string, string>();
  for (const [index, profile] of profiles.entries()) {
    const student = await prisma.student.create({
      data: {
        name: profile.name,
        phone: profile.phone,
        city: profile.city,
        sourceChannel: "短视频投流",
        sourceCampaign: profile.sourceCampaign,
        lowPriceCourseName: "4天公开直播课",
        lowPricePurchaseAt: daysAgo(15 - index),
        lowPriceAmount: 99,
        wechatAddedAt: daysAgo(14 - index),
        publicCourseJoinedAt: daysAgo(13 - index),
        publicCourseAttendance: index % 2 === 0 ? "3/4 天出勤" : "2/4 天出勤",
        riskLevel: profile.riskLevel,
        status: profile.status,
        leadId: leads[index].id,
        currentStage:
          profile.status === StudentStatus.REFUND_WARNING ||
          profile.status === StudentStatus.LEVEL1_PROCESSING ||
          profile.status === StudentStatus.LEVEL2_PROCESSING ||
          profile.status === StudentStatus.LEVEL3_PROCESSING ||
          profile.status === StudentStatus.RETAINED ||
          profile.status === StudentStatus.REFUNDED
            ? EnrollmentStage.REFUND
            : profile.finalPaymentStatus === PaymentStatus.PAID
              ? EnrollmentStage.PRE_START
              : profile.seatCardStatus === PaymentStatus.PAID
                ? EnrollmentStage.FINAL_PAYMENT
                : EnrollmentStage.PUBLIC_COURSE,
        intentNote: "系统 seed 学员",
        trackLane:
          index % 3 === 0 ? "短视频变现" : index % 3 === 1 ? "直播转化" : "IP 起号",
        cohortId: profile.cohort.id,
        salesOwnerId: profile.salesOwnerId,
        deliveryOwnerId: profile.deliveryOwnerId
      }
    });

    students.push(student);

    await prisma.salesFunnelEvent.createMany({
      data: [
        {
          leadId: leads[index].id,
          studentId: student.id,
          ownerId: profile.salesOwnerId,
          eventType: FunnelEventType.LEAD_INTAKE,
          stage: EnrollmentStage.LOW_PRICE,
          result: "进入线索池",
          eventAt: daysAgo(16 - index, 9),
          note: profile.sourceCampaign
        },
        {
          leadId: leads[index].id,
          studentId: student.id,
          ownerId: profile.salesOwnerId,
          eventType: FunnelEventType.ASSIGNED,
          stage: EnrollmentStage.WECHAT,
          result: "已分配销售",
          eventAt: daysAgo(16 - index, 9)
        },
        {
          leadId: leads[index].id,
          studentId: student.id,
          ownerId: profile.salesOwnerId,
          eventType: FunnelEventType.FIRST_CONTACT,
          stage: EnrollmentStage.WECHAT,
          result: "首次触达成功",
          eventAt: daysAgo(16 - index, 10)
        },
        {
          leadId: leads[index].id,
          studentId: student.id,
          ownerId: profile.salesOwnerId,
          eventType: FunnelEventType.ADD_WECHAT,
          stage: EnrollmentStage.WECHAT,
          result: "已加企微",
          eventAt: daysAgo(14 - index)
        },
        {
          leadId: leads[index].id,
          studentId: student.id,
          ownerId: profile.salesOwnerId,
          eventType: FunnelEventType.JOIN_GROUP,
          stage: EnrollmentStage.PUBLIC_COURSE,
          result: "已进学习群",
          eventAt: daysAgo(13 - index)
        },
        {
          leadId: leads[index].id,
          studentId: student.id,
          ownerId: profile.salesOwnerId,
          eventType: FunnelEventType.ATTEND_PUBLIC_COURSE,
          stage: EnrollmentStage.PUBLIC_COURSE,
          result: index % 2 === 0 ? "高互动" : "低互动",
          eventAt: daysAgo(12 - index)
        },
        ...(profile.seatCardAmount > 0
          ? [
              {
                leadId: leads[index].id,
                studentId: student.id,
                ownerId: profile.salesOwnerId,
                eventType: FunnelEventType.PAY_SEAT_CARD,
                stage: EnrollmentStage.SEAT_CARD,
                result: "已拍占位卡",
                eventAt: daysAgo(10 - index)
              }
            ]
          : []),
        ...(profile.finalPaymentAmount > 0
          ? [
              {
                leadId: leads[index].id,
                studentId: student.id,
                ownerId: profile.salesOwnerId,
                eventType: FunnelEventType.PAY_FINAL_PAYMENT,
                stage: EnrollmentStage.FINAL_PAYMENT,
                result: "已补尾款",
                eventAt: daysAgo(7 - index)
              },
              {
                leadId: leads[index].id,
                studentId: student.id,
                ownerId: profile.salesOwnerId,
                eventType: FunnelEventType.FORMAL_ENROLLMENT,
                stage: EnrollmentStage.FORMAL_ENROLLMENT,
                result: "正式报名",
                eventAt: profile.formallyEnrolledAt ?? daysAgo(6 - index)
              }
            ]
          : [
              {
                leadId: leads[index].id,
                studentId: student.id,
                ownerId: profile.salesOwnerId,
                eventType: FunnelEventType.CHASE_FINAL_PAYMENT,
                stage: EnrollmentStage.FINAL_PAYMENT,
                result: "尾款追单中",
                eventAt: daysAgo(5 - index)
              }
            ])
      ]
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: student.id,
        cohortId: profile.cohort.id,
        courseVersion: "密训2.0",
        lowPriceCourseName: "4天公开直播课",
        lowPriceAmount: 99,
        lowPricePurchaseAt: daysAgo(15 - index),
        wechatAddedAt: daysAgo(14 - index),
        publicCourseJoinedAt: daysAgo(13 - index),
        publicCourseLearning: index % 2 === 0 ? "积极互动" : "出勤波动",
        seatCardAmount: profile.seatCardAmount,
        seatCardStatus: profile.seatCardStatus,
        seatCardPaidAt: profile.seatCardAmount ? daysAgo(10 - index) : null,
        finalPaymentAmount: profile.finalPaymentAmount,
        finalPaymentStatus: profile.finalPaymentStatus,
        finalPaymentPaidAt:
          profile.finalPaymentStatus === PaymentStatus.PAID ? daysAgo(7 - index) : null,
        totalReceived: profile.seatCardAmount + profile.finalPaymentAmount,
        formallyEnrolledAt: profile.formallyEnrolledAt,
        observationStartedAt: profile.observationStartedAt,
        leadSourceLabel: index % 2 === 0 ? "直播全款 D1" : "占位卡 D2",
        tailPaymentOwnerId: profile.salesOwnerId,
        handoffToDeliveryAt: profile.finalPaymentAmount > 0 ? daysAgo(5 - index) : null,
        currentStage: student.currentStage,
        note: "自动生成的成交过程"
      }
    });

    enrollmentMap.set(student.id, enrollment.id);
  }

  const extraLeads = await prisma.lead.findMany({
    where: {
      phone: {
        in: extraLeadBlueprints.map((item) => item[1])
      }
    }
  });

  for (const lead of extraLeads) {
    const assignment = await prisma.leadAssignment.findFirst({
      where: { leadId: lead.id },
      orderBy: { assignedAt: "desc" }
    });

    await prisma.salesFunnelEvent.createMany({
      data: [
        {
          leadId: lead.id,
          ownerId: assignment?.assignedToId ?? null,
          eventType: FunnelEventType.LEAD_INTAKE,
          stage: EnrollmentStage.LOW_PRICE,
          result: "进入线索池",
          eventAt: lead.sourceTime,
          note: "未转学员线索"
        },
        {
          leadId: lead.id,
          ownerId: assignment?.assignedToId ?? null,
          eventType: FunnelEventType.ASSIGNED,
          stage: EnrollmentStage.WECHAT,
          result: "已分配销售",
          eventAt: assignment?.assignedAt ?? lead.sourceTime
        },
        ...(assignment?.firstContactAt
          ? [
              {
                leadId: lead.id,
                ownerId: assignment.assignedToId,
                eventType: FunnelEventType.FIRST_CONTACT,
                stage: EnrollmentStage.WECHAT,
                result: assignment.result,
                eventAt: assignment.firstContactAt
              }
            ]
          : [])
      ]
    });
  }

  const signalByCode = Object.fromEntries(riskSignalCatalog.map((item) => [item.code, item]));

  const riskSeed = [
    [students[1], "PRICE_PRESSURE", EnrollmentStage.FINAL_PAYMENT, salesA.id, "用户表示尾款压力较大，想拖到下月"],
    [students[2], "ASK_REFUND_POLICY", EnrollmentStage.PRE_START, deliveryB.id, "开课前连续追问退款政策"],
    [students[2], "VALUE_DOUBT", EnrollmentStage.PRE_START, deliveryB.id, "质疑课程是否真能落地"],
    [students[3], "EMOTIONAL_SHAKE", EnrollmentStage.PRE_START, deliveryB.id, "情绪摇摆，但愿意继续沟通"],
    [students[4], "FAMILY_OPPOSED", EnrollmentStage.PRE_START, salesA.id, "家人明确反对继续学习支出"],
    [students[5], "NO_INTERACTION", EnrollmentStage.PRE_START, deliveryA.id, "入群后长期不互动"],
    [students[5], "ASK_REFUND_POLICY", EnrollmentStage.REFUND, supervisor.id, "强烈要求退款"],
    [students[7], "NO_GROUP_JOIN", EnrollmentStage.PUBLIC_COURSE, salesB.id, "拍卡后未进群"],
    [students[7], "NO_PHONE_RESPONSE", EnrollmentStage.FINAL_PAYMENT, salesB.id, "销售连续两天未联系上"],
    [students[10], "NOT_SUITABLE", EnrollmentStage.PRE_START, salesB.id, "表示觉得课程不适合自己"],
    [students[11], "PRICE_PRESSURE", EnrollmentStage.FINAL_PAYMENT, salesB.id, "只付占位卡，迟迟不补尾款"]
  ] as const;

  for (const [student, signalCode, stage, reporterId, note] of riskSeed) {
    const signal = signalByCode[signalCode];
    await prisma.riskEvent.create({
      data: {
        studentId: student.id,
        enrollmentId: enrollmentMap.get(student.id),
        signalCode,
        signalLabel: signal.label,
        stage,
        severityScore: signal.severity,
        note,
        occurredAt: daysAgo(2),
        reporterId
      }
    });
  }

  const refundCases = [
    {
      student: students[2],
      level: RefundLevel.LEVEL2,
      status: RefundStatus.PROCESSING,
      reasonCategory: "课程预期不符",
      reasonSubcategory: "内容和想象不一致",
      amount: 6980,
      requestedAt: daysAgo(1, 14),
      currentHandlerId: deliveryB.id,
      createdById: salesB.id,
      actions: [
        {
          actionType: RefundActionType.CREATED,
          fromLevel: RefundLevel.LEVEL1,
          toLevel: RefundLevel.LEVEL1,
          actorId: salesB.id,
          note: "学员提出退款，一级处理开启",
          actedAt: daysAgo(1, 14)
        },
        {
          actionType: RefundActionType.ESCALATED,
          fromLevel: RefundLevel.LEVEL1,
          toLevel: RefundLevel.LEVEL2,
          actorId: salesB.id,
          note: "销售解释后仍强烈要求退款，升级交付",
          actedAt: daysAgo(1, 18)
        }
      ]
      ,
      approvals: [
        { approverId: salesManagerB.id, decision: RefundApprovalDecision.APPROVED, note: "销售负责人同意退款", decidedAt: daysAgo(1, 15) },
        { approverId: deliveryB.id, decision: RefundApprovalDecision.PENDING, note: null, decidedAt: null }
      ]
    },
    {
      student: students[3],
      level: RefundLevel.LEVEL2,
      status: RefundStatus.RETAINED,
      reasonCategory: "自我怀疑/怕学不会",
      reasonSubcategory: "基础差担心跟不上",
      amount: 6980,
      requestedAt: daysAgo(2, 11),
      currentHandlerId: deliveryB.id,
      createdById: salesB.id,
      retainedAmount: 6980,
      finalResult: "已挽回，转为轻陪跑方案",
      actions: [
        {
          actionType: RefundActionType.CREATED,
          fromLevel: RefundLevel.LEVEL1,
          toLevel: RefundLevel.LEVEL1,
          actorId: salesB.id,
          note: "学员表示担心学不会",
          actedAt: daysAgo(2, 11)
        },
        {
          actionType: RefundActionType.ESCALATED,
          fromLevel: RefundLevel.LEVEL1,
          toLevel: RefundLevel.LEVEL2,
          actorId: salesB.id,
          note: "需要交付老师给陪跑路径",
          actedAt: daysAgo(2, 16)
        },
        {
          actionType: RefundActionType.RETAINED,
          fromLevel: RefundLevel.LEVEL2,
          toLevel: RefundLevel.LEVEL2,
          actorId: deliveryB.id,
          note: "已拆解学习计划并建立 1v1 节奏",
          outcome: "挽回成功",
          actedAt: daysAgo(1, 10)
        }
      ]
      ,
      approvals: [
        { approverId: salesManagerB.id, decision: RefundApprovalDecision.APPROVED, note: "销售负责人已沟通并同意", decidedAt: daysAgo(2, 12) },
        { approverId: deliveryB.id, decision: RefundApprovalDecision.APPROVED, note: "交付确认无需退款", decidedAt: daysAgo(1, 10) }
      ]
    },
    {
      student: students[4],
      level: RefundLevel.LEVEL3,
      status: RefundStatus.REFUNDED,
      reasonCategory: "家人反对",
      reasonSubcategory: "配偶反对",
      amount: 6980,
      requestedAt: daysAgo(6, 9),
      currentHandlerId: supervisor.id,
      createdById: salesA.id,
      refundedAmount: 6980,
      finalResult: "全额退款，已结案",
      actions: [
        {
          actionType: RefundActionType.CREATED,
          fromLevel: RefundLevel.LEVEL1,
          toLevel: RefundLevel.LEVEL1,
          actorId: salesA.id,
          note: "销售先做解释沟通",
          actedAt: daysAgo(6, 9)
        },
        {
          actionType: RefundActionType.ESCALATED,
          fromLevel: RefundLevel.LEVEL1,
          toLevel: RefundLevel.LEVEL2,
          actorId: salesA.id,
          note: "交付承接失败，家人强烈反对",
          actedAt: daysAgo(6, 14)
        },
        {
          actionType: RefundActionType.ESCALATED,
          fromLevel: RefundLevel.LEVEL2,
          toLevel: RefundLevel.LEVEL3,
          actorId: deliveryB.id,
          note: "升级主管审批",
          actedAt: daysAgo(5, 10)
        },
        {
          actionType: RefundActionType.APPROVED_REFUND,
          fromLevel: RefundLevel.LEVEL3,
          toLevel: RefundLevel.LEVEL3,
          actorId: supervisor.id,
          note: "批准退款，避免客诉升级",
          outcome: "全额退款",
          actedAt: daysAgo(5, 16)
        }
      ]
      ,
      approvals: [
        { approverId: salesManagerA.id, decision: RefundApprovalDecision.APPROVED, note: "销售负责人同意退款", decidedAt: daysAgo(6, 10) },
        { approverId: deliveryB.id, decision: RefundApprovalDecision.APPROVED, note: "交付确认无法承接", decidedAt: daysAgo(5, 10) },
        { approverId: supervisor.id, decision: RefundApprovalDecision.APPROVED, note: "交付负责人批准", decidedAt: daysAgo(5, 16) }
      ]
    },
    {
      student: students[5],
      level: RefundLevel.LEVEL3,
      status: RefundStatus.ESCALATED,
      reasonCategory: "销售承诺争议",
      reasonSubcategory: "承诺服务争议",
      amount: 6980,
      requestedAt: daysAgo(2, 13),
      currentHandlerId: supervisor.id,
      createdById: salesB.id,
      actions: [
        {
          actionType: RefundActionType.CREATED,
          fromLevel: RefundLevel.LEVEL1,
          toLevel: RefundLevel.LEVEL1,
          actorId: salesB.id,
          note: "用户质疑承诺的服务和实际不一致",
          actedAt: daysAgo(2, 13)
        },
        {
          actionType: RefundActionType.ESCALATED,
          fromLevel: RefundLevel.LEVEL1,
          toLevel: RefundLevel.LEVEL2,
          actorId: salesB.id,
          note: "交付解释未果",
          actedAt: daysAgo(2, 18)
        },
        {
          actionType: RefundActionType.ESCALATED,
          fromLevel: RefundLevel.LEVEL2,
          toLevel: RefundLevel.LEVEL3,
          actorId: deliveryA.id,
          note: "升级主管定责",
          actedAt: daysAgo(1, 11)
        }
      ]
      ,
      approvals: [
        { approverId: salesManagerA.id, decision: RefundApprovalDecision.APPROVED, note: "销售负责人认为需退款", decidedAt: daysAgo(2, 14) },
        { approverId: deliveryA.id, decision: RefundApprovalDecision.REJECTED, note: "需先补充承诺核查", decidedAt: daysAgo(1, 12) },
        { approverId: supervisor.id, decision: RefundApprovalDecision.PENDING, note: null, decidedAt: null }
      ]
    },
    {
      student: students[10],
      level: RefundLevel.LEVEL1,
      status: RefundStatus.PROCESSING,
      reasonCategory: "课程预期不符",
      reasonSubcategory: "认为不适合当前阶段",
      amount: 6980,
      requestedAt: daysAgo(1, 9),
      currentHandlerId: salesB.id,
      createdById: salesB.id,
      actions: [
        {
          actionType: RefundActionType.CREATED,
          fromLevel: RefundLevel.LEVEL1,
          toLevel: RefundLevel.LEVEL1,
          actorId: salesB.id,
          note: "学员说课程节奏太快",
          actedAt: daysAgo(1, 9)
        }
      ]
      ,
      approvals: [
        { approverId: salesManagerB.id, decision: RefundApprovalDecision.PENDING, note: null, decidedAt: null },
        { approverId: deliveryA.id, decision: RefundApprovalDecision.PENDING, note: null, decidedAt: null }
      ]
    }
  ];

  for (const [index, item] of refundCases.entries()) {
    await prisma.refundRequest.create({
      data: {
        requestNo: `RR2026030${index + 1}`,
        studentId: item.student.id,
        enrollmentId: enrollmentMap.get(item.student.id),
        currentHandlerId: item.currentHandlerId,
        createdById: item.createdById,
        reasonCategory: item.reasonCategory,
        reasonSubcategory: item.reasonSubcategory,
        requestStage: EnrollmentStage.PRE_START,
        requestNote: "seed 退款案例",
        requestSource: "企微对话",
        requestedAt: item.requestedAt,
        requestedAmount: item.amount,
        currentLevel: item.level,
        status: item.status,
        refundedAmount: item.refundedAmount ?? 0,
        retainedAmount: item.retainedAmount ?? 0,
        finalResult: item.finalResult,
        resolvedAt:
          item.status === RefundStatus.RETAINED || item.status === RefundStatus.REFUNDED
            ? daysAgo(1)
            : null,
        approvals: {
          create: item.approvals
        },
        actions: {
          create: item.actions
        }
      }
    });
  }

  await recalculateAllCohortStats();

  console.log("Seed completed.");
  console.log(`Users: ${users.length}`);
  console.log(`Cohorts: ${cohorts.length}`);
  console.log(`Campaigns: ${campaigns.length}`);
  console.log(`Creatives: ${creatives.length}`);
  console.log(`Leads: ${leads.length + extraLeadBlueprints.length}`);
  console.log(`Students: ${students.length}`);
  console.log(`Refund cases: ${refundCases.length}`);
  console.log(`Admin login placeholder: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
