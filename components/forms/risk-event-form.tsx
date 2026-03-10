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
    reporterId: props.reporters[0]?.id ?? "",
    note: ""
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        <select
          className="field"
          value={form.reporterId}
          onChange={(event) =>
            setForm((current) => ({ ...current, reporterId: event.target.value }))
          }
        >
          {props.reporters.map((item) => (
            <option key={item.id} value={item.id}>
              {formatUserOptionLabel(item)}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="field-label">备注</label>
        <textarea
          className="field min-h-24 py-3"
          value={form.note}
          onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
        />
      </div>
      <div className="md:col-span-2">
        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "提交中..." : "新增风险事件"}
        </button>
      </div>
    </form>
  );
}
