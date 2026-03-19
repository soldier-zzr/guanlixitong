"use client";

import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";

type ParsedRow = {
  sourceTime: string;
  phone: string;
  name: string;
  orderInfo: string;
  assignedToName: string;
  note: string;
};

function parseRows(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [] as ParsedRow[];
  }

  return lines
    .map((line) => line.split("\t"))
    .filter((cells) => cells.length >= 2)
    .filter((cells, index) => {
      if (index > 0) {
        return true;
      }
      return !cells.some((cell) => cell.includes("手机号") || cell.includes("日期时间"));
    })
    .map((cells) => ({
      sourceTime: cells[0]?.trim() ?? "",
      phone: cells[1]?.trim() ?? "",
      name: cells[2]?.trim() ?? "",
      orderInfo: cells[3]?.trim() ?? "",
      assignedToName: cells[4]?.trim() ?? "",
      note: cells[5]?.trim() ?? ""
    }))
    .filter((row) => row.phone);
}

export function LeadBulkPasteForm() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const parsedRows = useMemo(() => parseRows(raw), [raw]);

  async function onSubmit() {
    if (parsedRows.length === 0) {
      window.alert("请先粘贴有效的接量表数据");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/leads/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: parsedRows })
    });
    const data = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      window.alert(data?.message ?? "批量导入失败");
      return;
    }

    window.alert(`导入完成：新增 ${data.created} 条，更新 ${data.updated} 条`);
    setRaw("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">在线粘贴</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">从 Excel 直接粘贴多行接量数据</h4>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            直接从表格复制多行，按 `日期时间 / 手机号 / 昵称 / 订单信息 / 分配销售 / 备注` 的列顺序粘贴即可。
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          当前识别 {parsedRows.length} 行
        </div>
      </div>

      <textarea
        className="field mt-4 min-h-[220px] py-3"
        placeholder={"日期时间\t手机号\t昵称\t订单信息\t分配销售\t备注\n2026-03-11 10:30\t13800138000\t张三\t99元低价课\t汪久渝\t首批接量"}
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <a className="btn-secondary" href="/api/reports/lead-intake-template">
          下载接量模板
        </a>
        <button className="btn-primary" disabled={loading} onClick={onSubmit} type="button">
          {loading ? "导入中..." : "执行在线导入"}
        </button>
      </div>
    </div>
  );
}
