"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function LeadBatchUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function onUpload() {
    if (!file) {
      window.alert("请先选择接量表文件");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("mode", "front");
    formData.append("file", file);

    const response = await fetch("/api/imports", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      window.alert(data.message || "批量上传失败");
      return;
    }

    window.alert(`上传完成：新增 ${data.created} 条，更新 ${data.updated} 条`);
    setFile(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">批量上传</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">批量导入系统内接量表</h4>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            适合录单同事一次性上传多条订单信息。导入后，销售承接人员继续在系统里补添加情况和备注。
          </p>
        </div>
        <a className="btn-secondary" href="/api/reports/lead-intake-template">
          下载接量模板
        </a>
      </div>

      <div className="mt-4">
        <label className="field-label">上传接量表</label>
        <input
          className="field py-2"
          type="file"
          accept=".xlsx,.xls"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        模板字段：
        <br />
        `日期时间`、`手机号`、`昵称`、`订单信息`、`分配销售`
      </div>

      <button className="btn-primary mt-4" disabled={loading} onClick={onUpload} type="button">
        {loading ? "上传中..." : "执行批量上传"}
      </button>
    </div>
  );
}
