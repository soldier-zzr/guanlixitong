import {
  FunnelEventType,
  EnrollmentStage,
  LeadStatus,
  RiskLevel,
  StudentStatus,
  RefundLevel,
  UserRole,
  UserTitle
} from "@prisma/client";

export const riskSignalCatalog = [
  { code: "NO_GROUP_JOIN", label: "不进群", severity: 4 },
  { code: "NO_INTERACTION", label: "不互动", severity: 3 },
  { code: "NO_PHONE_RESPONSE", label: "不接电话", severity: 4 },
  { code: "NO_TIME", label: "说没时间", severity: 5 },
  { code: "NOT_SUITABLE", label: "觉得不适合", severity: 6 },
  { code: "PRICE_PRESSURE", label: "价格压力大", severity: 6 },
  { code: "FAMILY_OPPOSED", label: "家人反对", severity: 7 },
  { code: "VALUE_DOUBT", label: "质疑课程价值", severity: 7 },
  { code: "ASK_REFUND_POLICY", label: "问退款政策", severity: 8 },
  { code: "EMOTIONAL_SHAKE", label: "开课前情绪摇摆", severity: 5 }
];

export const refundReasonCatalog = [
  {
    code: "TIME_ENERGY",
    label: "时间精力问题",
    children: ["工作忙", "家庭事务", "无法跟课", "执行时间不足"]
  },
  {
    code: "BUDGET_PRESSURE",
    label: "经济压力问题",
    children: ["尾款压力大", "近期现金流紧张", "家里不支持支出", "觉得性价比不足"]
  },
  {
    code: "FAMILY_OPPOSED",
    label: "家人反对",
    children: ["配偶反对", "父母反对", "共同决策未通过"]
  },
  {
    code: "EXPECTATION_GAP",
    label: "课程预期不符",
    children: ["内容和想象不一致", "认为不适合当前阶段", "期待结果过高", "误解课程形式"]
  },
  {
    code: "SELF_DOUBT",
    label: "自我怀疑/怕学不会",
    children: ["基础差担心跟不上", "年龄焦虑", "表达焦虑", "执行信心不足"]
  },
  {
    code: "DELIVERY_CONFIDENCE",
    label: "对交付没信心",
    children: ["担心没人管", "担心服务弱", "担心老师不专业", "担心群内氛围差"]
  },
  {
    code: "SALES_DISPUTE",
    label: "销售承诺争议",
    children: ["承诺效果争议", "承诺服务争议", "优惠争议", "信息理解偏差"]
  },
  {
    code: "IMPULSE_REGRET",
    label: "冲动消费后反悔",
    children: ["情绪下单", "直播间冲动", "回去冷静后反悔", "比较后反悔"]
  },
  {
    code: "OTHER",
    label: "其他",
    children: ["身体原因", "行程冲突", "重复购买", "特殊客诉"]
  }
];

export const studentStatusLabelMap: Record<StudentStatus, string> = {
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
};

export const protectedRefundStatuses: StudentStatus[] = [
  StudentStatus.REFUND_REQUESTED,
  StudentStatus.LEVEL1_PROCESSING,
  StudentStatus.LEVEL2_PROCESSING,
  StudentStatus.LEVEL3_PROCESSING,
  StudentStatus.RETAINED,
  StudentStatus.REFUNDED,
  StudentStatus.CLOSED
];

export const studentManualEditableStatuses: StudentStatus[] = [
  StudentStatus.LOW_PRICE_PURCHASED,
  StudentStatus.WECHAT_ADDED,
  StudentStatus.IN_GROUP_LEARNING,
  StudentStatus.SEAT_CARD_PAID,
  StudentStatus.FINAL_PAYMENT_PENDING,
  StudentStatus.FORMALLY_ENROLLED,
  StudentStatus.PRE_START_OBSERVING,
  StudentStatus.REFUND_WARNING
];

export const riskLevelLabelMap: Record<RiskLevel, string> = {
  A: "A 低风险",
  B: "B 中风险",
  C: "C 高风险"
};

export const enrollmentStageLabelMap: Record<EnrollmentStage, string> = {
  LOW_PRICE: "低价课",
  WECHAT: "企微承接",
  PUBLIC_COURSE: "公开课",
  SEAT_CARD: "占位卡",
  FINAL_PAYMENT: "尾款",
  FORMAL_ENROLLMENT: "正式报名",
  PRE_START: "开课前观察",
  REFUND: "退款处理"
};

export const refundLevelLabelMap: Record<RefundLevel, string> = {
  LEVEL1: "一级：销售",
  LEVEL2: "二级：交付",
  LEVEL3: "三级：主管"
};

export const userTitleLabelMap: Record<UserTitle, string> = {
  ADMIN: "管理员",
  MARKETING: "投放",
  SALES_MANAGER: "销售负责人",
  SALES: "销售",
  PRIVATE_OPS: "私域运营",
  PRIVATE_SUPERVISOR: "私域主管",
  DELIVERY_OPS: "交付运营",
  DELIVERY_SUPERVISOR: "交付主管"
};

export function deriveUserRoleFromTitle(title: UserTitle) {
  switch (title) {
    case UserTitle.ADMIN:
      return UserRole.ADMIN;
    case UserTitle.MARKETING:
      return UserRole.SALES;
    case UserTitle.SALES_MANAGER:
    case UserTitle.PRIVATE_SUPERVISOR:
    case UserTitle.DELIVERY_SUPERVISOR:
      return UserRole.SUPERVISOR;
    case UserTitle.DELIVERY_OPS:
      return UserRole.DELIVERY;
    case UserTitle.SALES:
    case UserTitle.PRIVATE_OPS:
    default:
      return UserRole.SALES;
  }
}

export const leadStatusLabelMap: Record<LeadStatus, string> = {
  NEW: "新进线索",
  ASSIGNED: "已分配",
  CONTACTED: "已联系",
  WECHAT_ADDED: "已加企微",
  IN_GROUP: "已进群",
  CONVERTED: "已转学员",
  LOST: "已流失"
};

export const funnelEventLabelMap: Record<FunnelEventType, string> = {
  LEAD_INTAKE: "进入线索池",
  ASSIGNED: "分配销售",
  FIRST_CONTACT: "首次触达",
  ADD_WECHAT: "添加企微",
  JOIN_GROUP: "进群",
  ATTEND_PUBLIC_COURSE: "参与公开课",
  PAY_SEAT_CARD: "支付占位卡",
  PAY_FULL: "直播间全款",
  CHASE_FINAL_PAYMENT: "尾款追单",
  PAY_FINAL_PAYMENT: "支付尾款",
  FORMAL_ENROLLMENT: "正式报名"
};
