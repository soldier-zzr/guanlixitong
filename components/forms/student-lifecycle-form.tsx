"use client";

import { RiskLevel, StudentStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { studentManualEditableStatuses, studentStatusLabelMap } from "@/lib/server/config";
import { formatUserOptionLabel } from "@/lib/utils";

type Option = { id: string; name: string; role?: string; title?: string | null; managerName?: string | null };

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 16);
}

export function StudentLifecycleForm(props: {
  studentId: string;
  status: StudentStatus;
  riskLevel: RiskLevel;
  cohortId?: string | null;
  salesOwnerId?: string | null;
  deliveryOwnerId?: string | null;
  intentNote?: string | null;
  trackLane?: string | null;
  leadSourceLabel?: string | null;
  tailPaymentOwnerId?: string | null;
  handoffToDeliveryAt?: string | null;
  users: Option[];
  cohorts: Option[];
  seatCardAmount: number;
  finalPaymentAmount: number;
  canEditSalesFields?: boolean;
  canEditDeliveryFields?: boolean;
  canEditRiskFields?: boolean;
}) {
  const router = useRouter();
  const salesUsers = props.users.filter(
    (item) => item.title === "SALES" || item.title === "PRIVATE_OPS"
  );
  const deliveryUsers = props.users.filter((item) => item.role === "DELIVERY");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{
    status: StudentStatus;
    riskLevel: RiskLevel;
    cohortId: string;
    salesOwnerId: string;
    deliveryOwnerId: string;
    intentNote: string;
    trackLane: string;
    leadSourceLabel: string;
    tailPaymentOwnerId: string;
    handoffToDeliveryAt: string;
    seatCardAmount: string;
    finalPaymentAmount: string;
  }>({
    status: props.status,
    riskLevel: props.riskLevel,
    cohortId: props.cohortId ?? "",
    salesOwnerId: props.salesOwnerId ?? "",
    deliveryOwnerId: props.deliveryOwnerId ?? "",
    intentNote: props.intentNote ?? "",
    trackLane: props.trackLane ?? "",
    leadSourceLabel: props.leadSourceLabel ?? "",
    tailPaymentOwnerId: props.tailPaymentOwnerId ?? "",
    handoffToDeliveryAt: toDateTimeLocal(props.handoffToDeliveryAt),
    seatCardAmount: String(props.seatCardAmount),
    finalPaymentAmount: String(props.finalPaymentAmount)
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.canEditSalesFields && !props.canEditDeliveryFields && !props.canEditRiskFields) {
      window.alert("当前岗位没有学员详情编辑权限");
      return;
    }
    setLoading(true);
    const response = await fetch(`/api/students/${props.studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        enrollment: {
          leadSourceLabel: form.leadSourceLabel,
          tailPaymentOwnerId: form.tailPaymentOwnerId,
          handoffToDeliveryAt: form.handoffToDeliveryAt || null,
          seatCardAmount: Number(form.seatCardAmount),
          finalPaymentAmount: Number(form.finalPaymentAmount)
        }
      })
    });
    setLoading(false);

    if (!response.ok) {
      window.alert("更新失败");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
      <div>
        <label className="field-label">当前状态</label>
        <select
          className="field"
          disabled={!props.canEditSalesFields}
          value={form.status}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              status: event.target.value as StudentStatus
            }))
          }
        >
          {studentManualEditableStatuses.map((status) => (
            <option key={status} value={status}>
              {studentStatusLabelMap[status]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">风险等级</label>
        <select
          className="field"
          disabled={!props.canEditRiskFields}
          value={form.riskLevel}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              riskLevel: event.target.value as RiskLevel
            }))
          }
        >
          <option value="A">A 低风险</option>
          <option value="B">B 中风险</option>
          <option value="C">C 高风险</option>
        </select>
      </div>
      <div>
        <label className="field-label">营期</label>
        <select
          className="field"
          disabled={!props.canEditSalesFields}
          value={form.cohortId}
          onChange={(event) =>
            setForm((current) => ({ ...current, cohortId: event.target.value }))
          }
        >
          <option value="">未分配</option>
          {props.cohorts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">销售负责人</label>
        <select
          className="field"
          disabled={!props.canEditSalesFields}
          value={form.salesOwnerId}
          onChange={(event) =>
            setForm((current) => ({ ...current, salesOwnerId: event.target.value }))
          }
        >
          {salesUsers.map((item) => (
            <option key={item.id} value={item.id}>
              {formatUserOptionLabel(item)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">交付负责人</label>
        <select
          className="field"
          disabled={!props.canEditDeliveryFields}
          value={form.deliveryOwnerId}
          onChange={(event) =>
            setForm((current) => ({ ...current, deliveryOwnerId: event.target.value }))
          }
        >
          {deliveryUsers.map((item) => (
            <option key={item.id} value={item.id}>
              {formatUserOptionLabel(item)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">赛道</label>
        <input
          className="field"
          disabled={!props.canEditSalesFields}
          placeholder="例如：短视频变现 / 直播转化"
          value={form.trackLane}
          onChange={(event) =>
            setForm((current) => ({ ...current, trackLane: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">占位卡金额</label>
        <input
          className="field"
          disabled={!props.canEditSalesFields}
          type="number"
          value={form.seatCardAmount}
          onChange={(event) =>
            setForm((current) => ({ ...current, seatCardAmount: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">例子来源标注</label>
        <input
          className="field"
          disabled={!props.canEditDeliveryFields}
          placeholder="例如：直播全款 D1 / 占位卡 D2"
          value={form.leadSourceLabel}
          onChange={(event) =>
            setForm((current) => ({ ...current, leadSourceLabel: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">尾款金额</label>
        <input
          className="field"
          disabled={!props.canEditSalesFields}
          type="number"
          value={form.finalPaymentAmount}
          onChange={(event) =>
            setForm((current) => ({ ...current, finalPaymentAmount: event.target.value }))
          }
        />
      </div>
      <div className="lg:col-span-2">
        <label className="field-label">追尾款负责人</label>
        <select
          className="field"
          disabled={!props.canEditDeliveryFields}
          value={form.tailPaymentOwnerId}
          onChange={(event) =>
            setForm((current) => ({ ...current, tailPaymentOwnerId: event.target.value }))
          }
        >
          <option value="">未分配</option>
          {salesUsers.map((item) => (
            <option key={item.id} value={item.id}>
              {formatUserOptionLabel(item)}
            </option>
          ))}
        </select>
      </div>
      <div className="lg:col-span-2">
        <label className="field-label">转交交付时间</label>
        <input
          className="field"
          disabled={!props.canEditDeliveryFields}
          type="datetime-local"
          value={form.handoffToDeliveryAt}
          onChange={(event) =>
            setForm((current) => ({ ...current, handoffToDeliveryAt: event.target.value }))
          }
        />
      </div>
      <div className="lg:col-span-2">
        <label className="field-label">跟进备注</label>
        <textarea
          className="field min-h-28 py-3"
          disabled={!props.canEditSalesFields && !props.canEditDeliveryFields}
          value={form.intentNote}
          onChange={(event) =>
            setForm((current) => ({ ...current, intentNote: event.target.value }))
          }
        />
      </div>
      <div className="lg:col-span-2">
        {(!props.canEditSalesFields && !props.canEditDeliveryFields && !props.canEditRiskFields) ? (
          <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            当前岗位仅可查看学员详情，不能修改状态、负责人或金额。
          </div>
        ) : null}
        <button
          className="btn-primary"
          disabled={loading || (!props.canEditSalesFields && !props.canEditDeliveryFields && !props.canEditRiskFields)}
          type="submit"
        >
          {loading ? "保存中..." : "更新主档案与成交状态"}
        </button>
      </div>
    </form>
  );
}
