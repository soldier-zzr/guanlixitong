"use client";

import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { formatUserOptionLabel } from "@/lib/utils";

type Dictionary = {
  code: string;
  label: string;
  parentCode?: string | null;
  type: string;
};

type User = {
  id: string;
  name: string;
  title?: string | null;
  managerName?: string | null;
};

export function RefundRequestForm(props: {
  studentId: string;
  currentHandlerId?: string | null;
  createdById?: string | null;
  dictionaries: Dictionary[];
  actorUsers: User[];
  canCreate?: boolean;
}) {
  const router = useRouter();
  const reasonL1 = props.dictionaries.filter((item) => item.type === "refund_reason_l1");
  const [selectedReason, setSelectedReason] = useState(reasonL1[0]?.label ?? "");
  const reasonL2 = useMemo(
    () =>
      props.dictionaries.filter(
        (item) =>
          item.type === "refund_reason_l2" &&
          item.parentCode === reasonL1.find((group) => group.label === selectedReason)?.code
      ),
    [props.dictionaries, reasonL1, selectedReason]
  );
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    reasonCategory: reasonL1[0]?.label ?? "",
    reasonSubcategory: "",
    requestNote: "",
    requestedAmount: "6980",
    currentHandlerId: props.currentHandlerId ?? props.actorUsers[0]?.id ?? "",
    createdById: props.createdById ?? props.actorUsers[0]?.id ?? ""
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.canCreate) {
      window.alert("当前岗位没有发起退款申请权限");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/refund-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        studentId: props.studentId
      })
    });
    setLoading(false);

    if (!response.ok) {
      window.alert("发起退款失败");
      return;
    }

    setForm((current) => ({
      ...current,
      requestNote: "",
      reasonSubcategory: ""
    }));
    startTransition(() => router.refresh());
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <div>
        <label className="field-label">一级原因</label>
        <select
          className="field"
          value={selectedReason}
          onChange={(event) => {
            const nextLabel = event.target.value;
            setSelectedReason(nextLabel);
            setForm((current) => ({
              ...current,
              reasonCategory: nextLabel,
              reasonSubcategory: ""
            }));
          }}
        >
          {reasonL1.map((item) => (
            <option key={item.code} value={item.label}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">二级原因</label>
        <select
          className="field"
          value={form.reasonSubcategory}
          onChange={(event) =>
            setForm((current) => ({ ...current, reasonSubcategory: event.target.value }))
          }
        >
          <option value="">请选择</option>
          {reasonL2.map((item) => (
            <option key={item.code} value={item.label}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">发起账号</label>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {formatUserOptionLabel(
            props.actorUsers.find((item) => item.id === form.createdById) ?? props.actorUsers[0] ?? { id: "", name: "未选择" }
          )}
        </div>
      </div>
      <div>
        <label className="field-label">申请金额</label>
        <input
          className="field"
          disabled={!props.canCreate}
          type="number"
          value={form.requestedAmount}
          onChange={(event) =>
            setForm((current) => ({ ...current, requestedAmount: event.target.value }))
          }
        />
      </div>
      <div className="md:col-span-2">
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          发起后系统会先走销售负责人同意；如果该学员已经转交交付，再补充交付同意节点。全部同意并留痕后，才允许确认退款。
        </div>
      </div>
      <div className="md:col-span-2">
        <label className="field-label">退款说明</label>
        <textarea
          className="field min-h-24 py-3"
          disabled={!props.canCreate}
          value={form.requestNote}
          onChange={(event) =>
            setForm((current) => ({ ...current, requestNote: event.target.value }))
          }
        />
      </div>
      <div className="md:col-span-2">
        {!props.canCreate ? (
          <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            当前岗位仅可查看退款留痕，不能发起新的退款申请。
          </div>
        ) : null}
        <button className="btn-primary" disabled={loading || !props.canCreate} type="submit">
          {loading ? "提交中..." : "发起退款申请"}
        </button>
      </div>
    </form>
  );
}
