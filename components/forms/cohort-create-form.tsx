"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function CohortCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    issueNumber: "",
    name: "",
    code: "",
    startDate: "",
    endDate: "",
    courseVersion: "密训2.0",
    adSpend: "0",
    targetRevenue: "0",
    note: ""
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/cohorts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      window.alert(payload?.message ?? "新增营期失败");
      return;
    }

    setForm({
      issueNumber: "",
      name: "",
      code: "",
      startDate: "",
      endDate: "",
      courseVersion: "密训2.0",
      adSpend: "0",
      targetRevenue: "0",
      note: ""
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={onSubmit}>
      <div>
        <label className="field-label">营期编号</label>
        <input
          className="field"
          placeholder="例如：6"
          value={form.issueNumber}
          onChange={(event) =>
            setForm((current) => ({ ...current, issueNumber: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">自定义名称</label>
        <input
          className="field"
          placeholder="留空则自动生成“起盘营6期”"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
      </div>
      <div>
        <label className="field-label">自定义编码</label>
        <input
          className="field"
          placeholder="留空则与名称一致"
          value={form.code}
          onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
        />
      </div>
      <div>
        <label className="field-label">开营日期</label>
        <input
          className="field"
          type="date"
          value={form.startDate}
          onChange={(event) =>
            setForm((current) => ({ ...current, startDate: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">结营日期</label>
        <input
          className="field"
          type="date"
          value={form.endDate}
          onChange={(event) =>
            setForm((current) => ({ ...current, endDate: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">课程版本</label>
        <input
          className="field"
          value={form.courseVersion}
          onChange={(event) =>
            setForm((current) => ({ ...current, courseVersion: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">投放预算</label>
        <input
          className="field"
          type="number"
          value={form.adSpend}
          onChange={(event) => setForm((current) => ({ ...current, adSpend: event.target.value }))}
        />
      </div>
      <div>
        <label className="field-label">目标营收</label>
        <input
          className="field"
          type="number"
          value={form.targetRevenue}
          onChange={(event) =>
            setForm((current) => ({ ...current, targetRevenue: event.target.value }))
          }
        />
      </div>
      <div className="xl:col-span-2">
        <label className="field-label">备注</label>
        <input
          className="field"
          placeholder="例如：新起盘打法 / 直播拉新专场"
          value={form.note}
          onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
        />
      </div>
      <div className="xl:col-span-5">
        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "创建中..." : "新增自定义营期"}
        </button>
      </div>
    </form>
  );
}
