"use client";

import { LeadStatus, StudentStatus } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { LeadStatusBadge, StudentStatusBadge } from "@/components/status-badge";
import { formatDateTime, formatUserOptionLabel } from "@/lib/utils";

type Option = {
  id: string;
  name: string;
  title?: string | null;
  role?: string;
  managerName?: string | null;
};

type CohortOption = {
  id: string;
  name: string;
  code: string;
};

type Row = {
  id: string;
  name: string;
  phone: string;
  sourceTime: string | Date;
  orderInfo?: string | null;
  leadStatus: LeadStatus;
  currentAssigneeId?: string | null;
  currentAssignee?: { name: string } | null;
  sourceOwner?: { name: string } | null;
  student?: {
    id: string;
    trackLane?: string | null;
    status: StudentStatus;
    cohortId?: string | null;
    salesOwnerId?: string | null;
    cohort?: { code: string } | null;
    enrollments: Array<{
      finalPaymentAmount: number;
      seatCardAmount: number;
    }>;
  } | null;
};

const leadStatusOptions: Array<{ value: LeadStatus; label: string }> = [
  { value: LeadStatus.ASSIGNED, label: "已分配" },
  { value: LeadStatus.CONTACTED, label: "已联系" },
  { value: LeadStatus.WECHAT_ADDED, label: "已加V" },
  { value: LeadStatus.IN_GROUP, label: "已进群" },
  { value: LeadStatus.LOST, label: "已流失" }
];

const studentStatusOptions: StudentStatus[] = [
  StudentStatus.LOW_PRICE_PURCHASED,
  StudentStatus.WECHAT_ADDED,
  StudentStatus.IN_GROUP_LEARNING,
  StudentStatus.SEAT_CARD_PAID,
  StudentStatus.FINAL_PAYMENT_PENDING,
  StudentStatus.FORMALLY_ENROLLED,
  StudentStatus.PRE_START_OBSERVING,
  StudentStatus.REFUND_WARNING
];

const studentStatusLabelMap: Record<StudentStatus, string> = {
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

export function MarketingCollaborationTable(props: {
  rows: Row[];
  users: Option[];
  cohorts: CohortOption[];
  permissions: {
    canInputLeads: boolean;
    canHandleLeads: boolean;
    canCreateStudents: boolean;
    canEditStudentSales: boolean;
  };
}) {
  const router = useRouter();
  const [rows, setRows] = useState(
    props.rows.map((row) => ({
      leadId: row.id,
      name: row.name,
      studentId: row.student?.id ?? "",
      leadStatus: row.leadStatus,
      salesOwnerId: row.student?.salesOwnerId ?? row.currentAssigneeId ?? "",
      cohortId: row.student?.cohortId ?? "",
      trackLane: row.student?.trackLane ?? "",
      studentStatus: row.student?.status ?? StudentStatus.LOW_PRICE_PURCHASED,
      finalPaymentAmount: String(row.student?.enrollments[0]?.finalPaymentAmount ?? 0)
    }))
  );
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const rowStateMap = useMemo(
    () => Object.fromEntries(rows.map((row) => [row.leadId, row])),
    [rows]
  );

  function patchRow(leadId: string, patch: Partial<(typeof rows)[number]>) {
    setRows((current) => current.map((row) => (row.leadId === leadId ? { ...row, ...patch } : row)));
  }

  async function saveLeadProfile(leadId: string) {
    const rowState = rowStateMap[leadId];
    if (!rowState || !props.permissions.canHandleLeads || loadingKey === `profile:${leadId}`) {
      return;
    }

    setLoadingKey(`profile:${leadId}`);
    const response = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_PROFILE",
        name: rowState.name
      })
    });
    setLoadingKey(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      window.alert(payload?.message ?? "昵称保存失败");
      return;
    }

    startTransition(() => router.refresh());
  }

  async function saveLeadProgress(leadId: string, nextStatus?: LeadStatus) {
    const rowState = rowStateMap[leadId];
    if (!rowState || !props.permissions.canHandleLeads || loadingKey === `lead:${leadId}`) {
      return;
    }

    const leadStatus = nextStatus ?? rowState.leadStatus;
    setLoadingKey(`lead:${leadId}`);
    const response = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_STATUS",
        leadStatus
      })
    });
    setLoadingKey(null);

    if (!response.ok) {
      window.alert("加V/承接状态更新失败");
      return;
    }

    startTransition(() => router.refresh());
  }

  async function createStudentFromLead(lead: Row) {
    const rowState = rowStateMap[lead.id];
    if (!rowState || !props.permissions.canCreateStudents) {
      return;
    }

    setLoadingKey(`create:${lead.id}`);
    const response = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: lead.name,
        phone: lead.phone,
        leadId: lead.id,
        cohortId: rowState.cohortId || null,
        salesOwnerId: rowState.salesOwnerId || lead.currentAssigneeId || null,
        trackLane: rowState.trackLane || null,
        lowPricePurchaseAt: lead.sourceTime,
        wechatAddedAt:
          rowState.leadStatus === LeadStatus.WECHAT_ADDED || rowState.leadStatus === LeadStatus.IN_GROUP
            ? new Date().toISOString()
            : null,
        publicCourseJoinedAt:
          rowState.leadStatus === LeadStatus.IN_GROUP ? new Date().toISOString() : null
      })
    });
    setLoadingKey(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      window.alert(payload?.message ?? "创建学员失败");
      return;
    }

    startTransition(() => router.refresh());
  }

  async function saveStudentProgress(
    leadId: string,
    nextPatch?: Partial<(typeof rows)[number]>
  ) {
    const currentState = rowStateMap[leadId];
    const rowState = currentState ? { ...currentState, ...nextPatch } : null;
    if (
      !rowState?.studentId ||
      !props.permissions.canEditStudentSales ||
      loadingKey === `student:${leadId}`
    ) {
      return;
    }

    setLoadingKey(`student:${leadId}`);
    const response = await fetch(`/api/students/${rowState.studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: rowState.studentStatus,
        cohortId: rowState.cohortId || null,
        salesOwnerId: rowState.salesOwnerId || null,
        trackLane: rowState.trackLane || null,
        enrollment: {
          finalPaymentAmount: Number(rowState.finalPaymentAmount || 0)
        }
      })
    });
    setLoadingKey(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      window.alert(payload?.message ?? "学员进度保存失败");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        投放录入后，这里会继续串销售承接和学员主档。销售可以在同一行继续补 `加V`、`赛道`、`成交状态`、`尾款金额`，投放则可以持续看到后续转化进展。
      </div>

      <div className="table-shell">
        <table className="min-w-[1760px]">
          <thead>
            <tr>
              <th>进线时间</th>
              <th>昵称 / 手机</th>
              <th className="whitespace-nowrap">分配销售</th>
              <th>订单信息</th>
              <th>加V进度</th>
              <th>赛道</th>
              <th>学员状态</th>
              <th>营期</th>
              <th>尾款金额</th>
              <th>档案</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((lead) => {
              const rowState = rowStateMap[lead.id];
              const student = lead.student;
              const hasStudent = Boolean(student);

              return (
                <tr key={lead.id}>
                  <td>{formatDateTime(lead.sourceTime)}</td>
                  <td>
                    <div className="min-w-[180px]">
                      <input
                        className="field h-10 rounded-xl px-3 font-medium text-slate-900"
                        disabled={!props.permissions.canHandleLeads || loadingKey === `profile:${lead.id}`}
                        value={rowState.name}
                        onBlur={() => void saveLeadProfile(lead.id)}
                        onChange={(event) => patchRow(lead.id, { name: event.target.value })}
                      />
                      <div className="mt-1 text-xs text-slate-500">{lead.phone}</div>
                    </div>
                  </td>
                  <td>
                    <div className="min-w-[120px] whitespace-nowrap">
                      {lead.currentAssignee ? formatUserOptionLabel(lead.currentAssignee) : "未分配"}
                    </div>
                  </td>
                  <td>
                    <div className="min-w-[200px] text-sm text-slate-600">{lead.orderInfo ?? "未填写"}</div>
                  </td>
                  <td>
                    <div className="min-w-[170px] space-y-2">
                      <LeadStatusBadge status={rowState.leadStatus} />
                      <select
                        className="field h-10 rounded-xl px-3"
                        disabled={!props.permissions.canHandleLeads || loadingKey === `lead:${lead.id}`}
                        value={rowState.leadStatus}
                        onChange={(event) => {
                          const nextStatus = event.target.value as LeadStatus;
                          patchRow(lead.id, { leadStatus: nextStatus });
                          void saveLeadProgress(lead.id, nextStatus);
                        }}
                      >
                        {leadStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td>
                    <input
                      className="field h-10 min-w-[160px] rounded-xl px-3"
                      disabled={!props.permissions.canEditStudentSales || !hasStudent}
                      placeholder={hasStudent ? "例如：短视频变现" : "先创建学员后填写"}
                      value={rowState.trackLane}
                      onBlur={() => {
                        if (hasStudent) {
                          void saveStudentProgress(lead.id);
                        }
                      }}
                      onChange={(event) => patchRow(lead.id, { trackLane: event.target.value })}
                    />
                  </td>
                  <td>
                    <div className="min-w-[180px] space-y-2">
                      {student ? (
                        <StudentStatusBadge status={rowState.studentStatus} />
                      ) : (
                        <span className="text-sm text-slate-500">未建档</span>
                      )}
                      <select
                        className="field h-10 rounded-xl px-3"
                        disabled={!props.permissions.canEditStudentSales || !hasStudent}
                        value={rowState.studentStatus}
                        onChange={(event) => {
                          const nextStatus = event.target.value as StudentStatus;
                          patchRow(lead.id, { studentStatus: nextStatus });
                          void saveStudentProgress(lead.id, { studentStatus: nextStatus });
                        }}
                      >
                        {studentStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {studentStatusLabelMap[status]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td>
                    <select
                      className="field h-10 min-w-[150px] rounded-xl px-3"
                      disabled={!props.permissions.canEditStudentSales}
                      value={rowState.cohortId}
                      onChange={(event) => {
                        const nextCohortId = event.target.value;
                        patchRow(lead.id, { cohortId: nextCohortId });
                        if (hasStudent) {
                          void saveStudentProgress(lead.id, { cohortId: nextCohortId });
                        }
                      }}
                    >
                      <option value="">未分配</option>
                      {props.cohorts.map((cohort) => (
                        <option key={cohort.id} value={cohort.id}>
                          {cohort.code}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="field h-10 min-w-[130px] rounded-xl px-3"
                      disabled={!props.permissions.canEditStudentSales || !hasStudent}
                      type="number"
                      value={rowState.finalPaymentAmount}
                      onBlur={() => {
                        if (hasStudent) {
                          void saveStudentProgress(lead.id);
                        }
                      }}
                      onChange={(event) =>
                        patchRow(lead.id, { finalPaymentAmount: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <div className="min-w-[120px]">
                      {student ? (
                        <Link
                          className="font-medium text-brand-700 hover:text-brand-800"
                          href={`/students/${student.id}`}
                        >
                          查看学员档案
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-500">未创建</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex min-w-[220px] flex-wrap gap-2">
                      {loadingKey === `lead:${lead.id}` ? (
                        <span className="inline-flex h-10 items-center rounded-xl border border-brand-200 bg-brand-50 px-3 text-xs font-medium text-brand-700">
                          正在保存加V进度...
                        </span>
                      ) : null}
                      {loadingKey === `profile:${lead.id}` ? (
                        <span className="inline-flex h-10 items-center rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-medium text-sky-700">
                          正在保存昵称...
                        </span>
                      ) : null}
                      {loadingKey === `student:${lead.id}` ? (
                        <span className="inline-flex h-10 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700">
                          正在保存学员进度...
                        </span>
                      ) : null}
                      {hasStudent ? (
                        <span className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-600">
                          学员字段已改为自动保存
                        </span>
                      ) : (
                        <button
                          className="btn-primary h-10 rounded-xl px-3 text-xs"
                          disabled={!props.permissions.canCreateStudents || loadingKey === `create:${lead.id}`}
                          onClick={() => createStudentFromLead(lead)}
                          type="button"
                        >
                          {loadingKey === `create:${lead.id}` ? "创建中..." : "创建学员档案"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
