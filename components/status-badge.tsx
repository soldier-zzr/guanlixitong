import { EnrollmentStage, LeadStatus, RefundStatus, RiskLevel, StudentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  enrollmentStageLabelMap,
  leadStatusLabelMap,
  riskLevelLabelMap,
  studentStatusLabelMap
} from "@/lib/server/config";

type Variant = "neutral" | "brand" | "warning" | "danger" | "success";

function badgeClass(variant: Variant) {
  return {
    neutral: "bg-slate-100 text-slate-700",
    brand: "bg-brand-100 text-brand-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-rose-100 text-rose-800",
    success: "bg-emerald-100 text-emerald-800"
  }[variant];
}

export function Badge(props: { label: string; variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        badgeClass(props.variant ?? "neutral")
      )}
    >
      {props.label}
    </span>
  );
}

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const warningStatuses: StudentStatus[] = [
    StudentStatus.LEVEL1_PROCESSING,
    StudentStatus.LEVEL2_PROCESSING,
    StudentStatus.LEVEL3_PROCESSING,
    StudentStatus.REFUND_WARNING,
    StudentStatus.REFUND_REQUESTED
  ];
  const variant =
    status === StudentStatus.REFUNDED
      ? "danger"
      : status === StudentStatus.RETAINED
        ? "success"
        : warningStatuses.includes(status)
          ? "warning"
          : "brand";
  return <Badge label={studentStatusLabelMap[status]} variant={variant} />;
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const variant = level === RiskLevel.C ? "danger" : level === RiskLevel.B ? "warning" : "success";
  return <Badge label={riskLevelLabelMap[level]} variant={variant} />;
}

export function StageBadge({ stage }: { stage: EnrollmentStage }) {
  const variant = stage === EnrollmentStage.REFUND ? "danger" : stage === EnrollmentStage.PRE_START ? "warning" : "neutral";
  return <Badge label={enrollmentStageLabelMap[stage]} variant={variant} />;
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const variant =
    status === LeadStatus.CONVERTED
      ? "success"
      : status === LeadStatus.LOST
        ? "danger"
        : status === LeadStatus.NEW
          ? "neutral"
          : "brand";
  return <Badge label={leadStatusLabelMap[status]} variant={variant} />;
}

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const labelMap: Record<RefundStatus, string> = {
    OPEN: "待处理",
    PROCESSING: "处理中",
    ESCALATED: "已升级",
    RETAINED: "已挽回",
    REFUNDED: "已退款",
    REJECTED: "已拒绝",
    CLOSED: "已结案"
  };
  const variant =
    status === RefundStatus.REFUNDED
      ? "danger"
      : status === RefundStatus.RETAINED
        ? "success"
        : status === RefundStatus.ESCALATED
          ? "warning"
          : "neutral";
  return <Badge label={labelMap[status]} variant={variant} />;
}
