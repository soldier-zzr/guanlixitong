"use client";

import { StudentStatus } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { RiskBadge, StageBadge, StudentStatusBadge } from "@/components/status-badge";
import { studentManualEditableStatuses, studentStatusLabelMap } from "@/lib/server/config";
import { formatDateOnly, formatUserOptionLabel } from "@/lib/utils";

type UserOption = {
  id: string;
  name: string;
  role?: string;
  title?: string | null;
  managerName?: string | null;
};

type CohortOption = {
  id: string;
  name: string;
  code: string;
};

type StudentRow = {
  id: string;
  name: string;
  phone: string;
  status: StudentStatus;
  riskLevel: "A" | "B" | "C";
  currentStage: "LOW_PRICE" | "WECHAT" | "PUBLIC_COURSE" | "SEAT_CARD" | "FINAL_PAYMENT" | "FORMAL_ENROLLMENT" | "PRE_START" | "REFUND";
  cohortId?: string | null;
  salesOwnerId?: string | null;
  deliveryOwnerId?: string | null;
  intentNote?: string | null;
  trackLane?: string | null;
  lowPricePurchaseAt?: string | Date | null;
  sourceCampaign?: string | null;
  cohort?: { code: string } | null;
  salesOwner?: { name: string } | null;
  deliveryOwner?: { name: string } | null;
  refundRequests: Array<{
    reasonCategory: string;
    status: string;
  }>;
};

function getEnrollmentSnapshot(status: StudentStatus) {
  const seatCardStatuses: StudentStatus[] = [
    StudentStatus.SEAT_CARD_PAID,
    StudentStatus.FINAL_PAYMENT_PENDING
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

  if (seatCardStatuses.includes(status)) {
    return "已占位";
  }

  if (formalStatuses.includes(status)) {
    return "已报课";
  }

  return "未报课";
}

export function StudentEditableTable(props: {
  students: StudentRow[];
  users: UserOption[];
  cohorts: CohortOption[];
  permissions: {
    canEditSales: boolean;
    canEditDelivery: boolean;
    canBulkEdit: boolean;
  };
}) {
  const router = useRouter();
  const salesUsers = props.users.filter(
    (item) => item.title === "SALES" || item.title === "PRIVATE_OPS"
  );
  const deliveryUsers = props.users.filter((item) => item.role === "DELIVERY");
  const [rows, setRows] = useState(
    props.students.map((student) => ({
      id: student.id,
      name: student.name,
      phone: student.phone,
      status: student.status,
      cohortId: student.cohortId ?? "",
      salesOwnerId: student.salesOwnerId ?? "",
      deliveryOwnerId: student.deliveryOwnerId ?? "",
      trackLane: student.trackLane ?? "",
      intentNote: student.intentNote ?? ""
    }))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkForm, setBulkForm] = useState({
    status: "",
    cohortId: "",
    salesOwnerId: "",
    deliveryOwnerId: ""
  });

  const rowMap = useMemo(
    () => Object.fromEntries(rows.map((row) => [row.id, row])),
    [rows]
  );

  function updateRow(id: string, patch: Partial<(typeof rows)[number]>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  async function saveRow(id: string) {
    if (!props.permissions.canEditSales && !props.permissions.canEditDelivery) {
      window.alert("当前岗位没有学员编辑权限");
      return;
    }

    const row = rowMap[id];
    if (!row) {
      return;
    }

    setSavingId(id);
    const response = await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row)
    });
    setSavingId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      window.alert(payload?.message ?? "保存失败");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function applyBulkEdit() {
    if (!props.permissions.canBulkEdit) {
      window.alert("当前岗位没有批量修改权限");
      return;
    }

    if (selectedIds.length === 0) {
      window.alert("请先选择学员");
      return;
    }

    const payload = Object.fromEntries(
      Object.entries({
        status: bulkForm.status || undefined,
        cohortId: bulkForm.cohortId || undefined,
        salesOwnerId: bulkForm.salesOwnerId || undefined,
        deliveryOwnerId: bulkForm.deliveryOwnerId || undefined
      }).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(payload).length === 0) {
      window.alert("请至少选择一个批量修改项");
      return;
    }

    const response = await fetch("/api/students/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentIds: selectedIds,
        ...payload
      })
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      window.alert(result?.message ?? "批量修改失败");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">批量销售操作</div>
            <p className="mt-1 text-xs text-slate-500">
              {props.permissions.canBulkEdit
                ? "勾选多条学员后，可统一挂营期、改负责人或推进报课状态。"
                : "当前岗位为只读视角，不能批量修改学员。"}
            </p>
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            已选 {selectedIds.length} 人
          </div>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-4">
          <select
            className="field"
            disabled={!props.permissions.canBulkEdit}
            value={bulkForm.status}
            onChange={(event) => setBulkForm((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">批量改状态</option>
            {studentManualEditableStatuses.map((status) => (
              <option key={status} value={status}>
                {studentStatusLabelMap[status]}
              </option>
            ))}
          </select>
          <select
            className="field"
            disabled={!props.permissions.canBulkEdit}
            value={bulkForm.cohortId}
            onChange={(event) => setBulkForm((current) => ({ ...current, cohortId: event.target.value }))}
          >
            <option value="">批量挂营期</option>
            {props.cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </select>
          <select
            className="field"
            disabled={!props.permissions.canBulkEdit}
            value={bulkForm.salesOwnerId}
            onChange={(event) =>
              setBulkForm((current) => ({ ...current, salesOwnerId: event.target.value }))
            }
          >
            <option value="">批量分配销售</option>
            {salesUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {formatUserOptionLabel(user)}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <select
              className="field"
              disabled={!props.permissions.canBulkEdit}
              value={bulkForm.deliveryOwnerId}
              onChange={(event) =>
                setBulkForm((current) => ({ ...current, deliveryOwnerId: event.target.value }))
              }
            >
              <option value="">批量分配交付</option>
              {deliveryUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {formatUserOptionLabel(user)}
                </option>
              ))}
            </select>
            <button
              className="btn-primary shrink-0 px-5 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!props.permissions.canBulkEdit}
              onClick={applyBulkEdit}
              type="button"
            >
              应用
            </button>
          </div>
        </div>
      </div>

      <div className="table-shell overflow-x-auto">
        <table className="min-w-[1720px]">
          <thead>
            <tr>
              <th className="w-12">
                <input
                  aria-label="全选学员"
                  checked={selectedIds.length > 0 && selectedIds.length === props.students.length}
                  onChange={(event) =>
                    setSelectedIds(event.target.checked ? props.students.map((student) => student.id) : [])
                  }
                  type="checkbox"
                />
              </th>
              <th className="whitespace-nowrap">学员</th>
              <th className="whitespace-nowrap">手机号</th>
              <th className="whitespace-nowrap">报课</th>
              <th className="whitespace-nowrap">成交状态</th>
              <th className="whitespace-nowrap">营期</th>
              <th className="whitespace-nowrap">赛道</th>
              <th className="whitespace-nowrap">销售</th>
              <th className="whitespace-nowrap">交付</th>
              <th className="whitespace-nowrap">风险</th>
              <th className="whitespace-nowrap">阶段</th>
              <th className="whitespace-nowrap">低价课购买</th>
              <th className="whitespace-nowrap">销售备注</th>
              <th className="whitespace-nowrap">退款进展</th>
              <th className="whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            {props.students.map((student) => {
              const row = rowMap[student.id];
              const refund = student.refundRequests[0];

              return (
                <tr key={student.id}>
                  <td>
                    <input
                      aria-label={`选择${student.name}`}
                      checked={selectedIds.includes(student.id)}
                      onChange={() => toggleSelected(student.id)}
                      type="checkbox"
                    />
                  </td>
                  <td>
                    <div className="min-w-[164px] space-y-2">
                      <input
                        disabled={!props.permissions.canEditSales}
                        className="field h-10 rounded-xl px-3"
                        value={row.name}
                        onChange={(event) => updateRow(student.id, { name: event.target.value })}
                      />
                      <Link
                        className="inline-flex text-xs font-semibold text-brand-700 transition hover:text-brand-800"
                        href={`/students/${student.id}`}
                      >
                        查看详情
                      </Link>
                    </div>
                  </td>
                  <td>
                    <input
                      disabled={!props.permissions.canEditSales}
                      className="field h-10 min-w-[150px] rounded-xl px-3"
                      value={row.phone}
                      onChange={(event) => updateRow(student.id, { phone: event.target.value })}
                    />
                  </td>
                  <td>
                    <span className="inline-flex min-w-[72px] justify-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 whitespace-nowrap">
                      {getEnrollmentSnapshot(row.status)}
                    </span>
                  </td>
                  <td>
                    <div className="min-w-[190px] space-y-2">
                      <StudentStatusBadge status={row.status} />
                      <select
                        disabled={!props.permissions.canEditSales}
                        className="field h-10 rounded-xl px-3"
                        value={row.status}
                        onChange={(event) =>
                          updateRow(student.id, {
                            status: event.target.value as StudentStatus
                          })
                        }
                      >
                        {studentManualEditableStatuses.map((status) => (
                          <option key={status} value={status}>
                            {studentStatusLabelMap[status]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="min-w-[180px]">
                      <select
                        disabled={!props.permissions.canEditSales}
                        className="field h-10 rounded-xl px-3"
                        value={row.cohortId}
                        onChange={(event) =>
                          updateRow(student.id, {
                            cohortId: event.target.value
                          })
                        }
                      >
                        <option value="">未分配</option>
                        {props.cohorts.map((cohort) => (
                          <option key={cohort.id} value={cohort.id}>
                            {cohort.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td>
                    <input
                      disabled={!props.permissions.canEditSales}
                      className="field h-10 min-w-[180px] rounded-xl px-3"
                      placeholder="赛道"
                      value={row.trackLane}
                      onChange={(event) =>
                        updateRow(student.id, {
                          trackLane: event.target.value
                        })
                      }
                    />
                  </td>
                  <td>
                    <div className="min-w-[180px]">
                      <select
                        disabled={!props.permissions.canEditSales}
                        className="field h-10 rounded-xl px-3"
                        value={row.salesOwnerId}
                        onChange={(event) =>
                          updateRow(student.id, {
                            salesOwnerId: event.target.value
                          })
                        }
                      >
                        <option value="">未分配</option>
                        {salesUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {formatUserOptionLabel(user)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="min-w-[180px]">
                      <select
                        disabled={!props.permissions.canEditDelivery}
                        className="field h-10 rounded-xl px-3"
                        value={row.deliveryOwnerId}
                        onChange={(event) =>
                          updateRow(student.id, {
                            deliveryOwnerId: event.target.value
                          })
                        }
                      >
                        <option value="">未分配</option>
                        {deliveryUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {formatUserOptionLabel(user)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="min-w-[92px]">
                      <RiskBadge level={student.riskLevel} />
                    </div>
                  </td>
                  <td>
                    <div className="min-w-[112px]">
                      <StageBadge stage={student.currentStage} />
                    </div>
                  </td>
                  <td>{formatDateOnly(student.lowPricePurchaseAt)}</td>
                  <td>
                    <textarea
                      disabled={!props.permissions.canEditSales}
                      className="field min-h-[92px] min-w-[240px] rounded-2xl px-3 py-3"
                      placeholder="记录报课进度、异议点、跟进结果"
                      value={row.intentNote}
                      onChange={(event) =>
                        updateRow(student.id, {
                          intentNote: event.target.value
                        })
                      }
                    />
                  </td>
                  <td>
                    {refund ? (
                      <div className="min-w-[140px]">
                        <div className="font-medium text-slate-800">{refund.reasonCategory}</div>
                        <div className="mt-1 text-xs text-slate-500">{refund.status}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400">暂无退款申请</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn-primary h-10 rounded-xl px-4"
                      disabled={
                        savingId === student.id ||
                        (!props.permissions.canEditSales && !props.permissions.canEditDelivery)
                      }
                      onClick={() => saveRow(student.id)}
                      type="button"
                    >
                      {savingId === student.id ? "保存中..." : "保存"}
                    </button>
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
