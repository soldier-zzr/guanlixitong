"use client";

import { EnrollmentStage } from "@prisma/client";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { enrollmentStageLabelMap, riskSignalCatalog } from "@/lib/server/config";
import { formatUserOptionLabel } from "@/lib/utils";

type Reporter = { id: string; name: string; title?: string | null };

export function RiskEventForm(props: {
  studentId: string;
  enrollmentId?: string;
  reporters: Reporter[];
  currentReporterId?: string | null;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{
    signalCode: string;
    stage: EnrollmentStage;
    reporterId: string;
    note: string;
  }>({
    signalCode: riskSignalCatalog[0].code,
    stage: EnrollmentStage.PRE_START,
    reporterId: props.currentReporterId ?? props.reporters[0]?.id ?? "",
    note: ""
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.canEdit) {
      window.alert("当前岗位没有新增风险事件权限");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/risk-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        studentId: props.studentId,
        enrollmentId: props.enrollmentId
      })
    });
    setLoading(false);

    if (!response.ok) {
      window.alert("添加风险事件失败");
      return;
    }

    setForm((current) => ({ ...current, note: "" }));
    startTransition(() => router.refresh());
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
      <div>
        <label className="field-label">预警信号</label>
      <select
        className="field"
        disabled={!props.canEdit}
        value={form.signalCode}
        onChange={(event) =>
          setForm((current) => ({ ...current, signalCode: event.target.value }))
          }
        >
          {riskSignalCatalog.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">发生阶段</label>
      <select
        className="field"
        disabled={!props.canEdit}
        value={form.stage}
        onChange={(event) =>
          setForm((current) => ({
              ...current,
              stage: event.target.value as EnrollmentStage
            }))
          }
        >
          {Object.entries(enrollmentStageLabelMap).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">记录人</label>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {formatUserOptionLabel(
            props.reporters.find((item) => item.id === form.reporterId) ?? props.reporters[0] ?? { id: "", name: "未选择" }
          )}
        </div>
      </div>
      <div className="md:col-span-2">
        <label className="field-label">备注</label>
        <textarea
          className="field min-h-24 py-3"
          disabled={!props.canEdit}
          value={form.note}
          onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
        />
      </div>
      <div className="md:col-span-2">
        <button className="btn-primary" disabled={loading || !props.canEdit} type="submit">
          {loading ? "提交中..." : "新增风险事件"}
        </button>
      </div>
    </form>
  );
}
