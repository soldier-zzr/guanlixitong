"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function ImportRunner(props: {
  frontDefaultPath: string;
  midDefaultPath: string;
}) {
  const router = useRouter();
  const [frontPath, setFrontPath] = useState(props.frontDefaultPath);
  const [midPath, setMidPath] = useState(props.midDefaultPath);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [midFile, setMidFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<"front" | "mid" | null>(null);

  async function runImport(mode: "front" | "mid") {
    setLoading(mode);
    const formData = new FormData();
    formData.append("mode", mode);
    formData.append("filePath", mode === "front" ? frontPath : midPath);
    const selectedFile = mode === "front" ? frontFile : midFile;
    if (selectedFile) {
      formData.append("file", selectedFile);
    }

    const response = await fetch("/api/imports", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    setLoading(null);

    if (!response.ok) {
      window.alert(data.message || "导入失败");
      return;
    }

    window.alert(JSON.stringify(data, null, 2));
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">前端表</p>
        <h4 className="mt-2 text-lg font-semibold text-slate-950">接量导入</h4>
        <p className="mt-2 text-sm leading-6 text-slate-500">导入进线、助教、是否加上、意向等级、备注等字段。</p>
        <div className="mt-4">
          <label className="field-label">文件路径</label>
          <input className="field" value={frontPath} onChange={(event) => setFrontPath(event.target.value)} />
        </div>
        <div className="mt-4">
          <label className="field-label">或直接上传文件</label>
          <input className="field py-2" type="file" accept=".xlsx,.xls" onChange={(event) => setFrontFile(event.target.files?.[0] ?? null)} />
        </div>
        <button className="btn-primary mt-4" disabled={loading !== null} onClick={() => runImport("front")} type="button">
          {loading === "front" ? "导入中..." : "执行前端表导入"}
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">中端表</p>
        <h4 className="mt-2 text-lg font-semibold text-slate-950">尾款工单导入</h4>
        <p className="mt-2 text-sm leading-6 text-slate-500">导入转化期数、尾款状态、沟通记录、退款信息，并回写学员与报名状态。</p>
        <div className="mt-4">
          <label className="field-label">文件路径</label>
          <input className="field" value={midPath} onChange={(event) => setMidPath(event.target.value)} />
        </div>
        <div className="mt-4">
          <label className="field-label">或直接上传文件</label>
          <input className="field py-2" type="file" accept=".xlsx,.xls" onChange={(event) => setMidFile(event.target.files?.[0] ?? null)} />
        </div>
        <button className="btn-primary mt-4" disabled={loading !== null} onClick={() => runImport("mid")} type="button">
          {loading === "mid" ? "导入中..." : "执行中端表导入"}
        </button>
      </div>
    </div>
  );
}
