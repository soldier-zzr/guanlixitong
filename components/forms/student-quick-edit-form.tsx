"use client";

import { StudentStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { studentStatusLabelMap } from "@/lib/server/config";
import { formatUserOptionLabel } from "@/lib/utils";

type Option = { id: string; name: string; role?: string; title?: string | null; managerName?: string | null };

const salesEditableStatuses: StudentStatus[] = [
  StudentStatus.LOW_PRICE_PURCHASED,
  StudentStatus.WECHAT_ADDED,
  StudentStatus.IN_GROUP_LEARNING,
  StudentStatus.SEAT_CARD_PAID,
  StudentStatus.FINAL_PAYMENT_PENDING,
  StudentStatus.FORMALLY_ENROLLED,
  StudentStatus.PRE_START_OBSERVING,
  StudentStatus.REFUND_WARNING
];

export function StudentQuickEditForm(props: {
  studentId: string;
  name: string;
  phone: string;
  status: StudentStatus;
  cohortId?: string | null;
  salesOwnerId?: string | null;
  deliveryOwnerId?: string | null;
  trackLane?: string | null;
  intentNote?: string | null;
  cohorts: Option[];
  users: Option[];
}) {
  const router = useRouter();
  const salesUsers = props.users.filter((item) => item.role === "SALES");
  const deliveryUsers = props.users.filter((item) => item.role === "DELIVERY");
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: props.name,
    phone: props.phone,
    status: props.status,
    cohortId: props.cohortId ?? "",
    salesOwnerId: props.salesOwnerId ?? "",
    deliveryOwnerId: props.deliveryOwnerId ?? "",
    trackLane: props.trackLane ?? "",
    intentNote: props.intentNote ?? ""
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch(`/api/students/${props.studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      window.alert(payload?.message ?? "学员更新失败");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
    setExpanded(false);
  }

  return (
    <div className="space-y-2">
      <button
        className="btn-secondary px-3 py-2 text-xs"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        {expanded ? "收起快速编辑" : "快速编辑"}
      </button>
      {expanded ? (
        <form className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3" onSubmit={onSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="field-label">姓名</label>
              <input
                className="field"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="field-label">手机号</label>
              <input
                className="field"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="field-label">是否报课 / 成交状态</label>
              <select
                className="field"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as StudentStatus
                  }))
                }
              >
                {salesEditableStatuses.map((status) => (
                  <option key={status} value={status}>
                    {studentStatusLabelMap[status]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">营期</label>
              <select
                className="field"
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
                value={form.salesOwnerId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, salesOwnerId: event.target.value }))
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
            <div>
              <label className="field-label">交付负责人</label>
              <select
                className="field"
                value={form.deliveryOwnerId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, deliveryOwnerId: event.target.value }))
                }
              >
                <option value="">未分配</option>
                {deliveryUsers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatUserOptionLabel(item)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">赛道</label>
            <input
              className="field"
              placeholder="例如：IP 变现 / 直播转化"
              value={form.trackLane}
              onChange={(event) =>
                setForm((current) => ({ ...current, trackLane: event.target.value }))
              }
            />
          </div>
          <div>
            <label className="field-label">销售备注</label>
            <textarea
              className="field min-h-24 py-3"
              placeholder="记录是否已报课、卡点、跟进结论"
              value={form.intentNote}
              onChange={(event) =>
                setForm((current) => ({ ...current, intentNote: event.target.value }))
              }
            />
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" disabled={saving} type="submit">
              {saving ? "保存中..." : "保存销售修改"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
