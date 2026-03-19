"use client";

import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { formatUserOptionLabel } from "@/lib/utils";

type Campaign = {
  id: string;
  name: string;
};

type Creative = {
  id: string;
  creativeName: string;
  campaignId: string;
};

type User = {
  id: string;
  name: string;
  role?: string;
  title?: string | null;
  managerName?: string | null;
};

export function LeadCreateForm(props: {
  campaigns: Campaign[];
  creatives: Creative[];
  users: User[];
}) {
  const router = useRouter();
  const salesUsers = props.users.filter(
    (item) => item.title === "SALES" || item.title === "PRIVATE_OPS"
  );
  const [form, setForm] = useState({
    name: "",
    phone: "",
    sourceTime: "",
    orderInfo: "",
    campaignId: props.campaigns[0]?.id ?? "",
    creativeId: "",
    currentAssigneeId: salesUsers[0]?.id ?? "",
    note: ""
  });
  const [loading, setLoading] = useState(false);

  const creativeOptions = useMemo(
    () => props.creatives.filter((item) => item.campaignId === form.campaignId),
    [form.campaignId, props.creatives]
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        creativeId: form.creativeId || creativeOptions[0]?.id || null
      })
    });
    setLoading(false);

    if (!response.ok) {
      window.alert("新增线索失败");
      return;
    }

    setForm((current) => ({
      ...current,
      name: "",
      phone: "",
      sourceTime: "",
      orderInfo: "",
      note: ""
    }));
    startTransition(() => router.refresh());
  }

  return (
    <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={onSubmit}>
      <div>
        <label className="field-label">用户昵称</label>
        <input className="field" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
      </div>
      <div>
        <label className="field-label">手机号</label>
        <input className="field" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
      </div>
      <div>
        <label className="field-label">日期时间</label>
        <input className="field" type="datetime-local" value={form.sourceTime} onChange={(event) => setForm((current) => ({ ...current, sourceTime: event.target.value }))} />
      </div>
      <div>
        <label className="field-label">订单信息</label>
        <input className="field" placeholder="例如：99 元低价课 / 订单号 / 支付成功" value={form.orderInfo} onChange={(event) => setForm((current) => ({ ...current, orderInfo: event.target.value }))} />
      </div>
      <div>
        <label className="field-label">分配销售</label>
        <select className="field" value={form.currentAssigneeId} onChange={(event) => setForm((current) => ({ ...current, currentAssigneeId: event.target.value }))}>
          {salesUsers.map((item) => (
            <option key={item.id} value={item.id}>
              {formatUserOptionLabel(item)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">来源计划（可选）</label>
        <select
          className="field"
          value={form.campaignId}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              campaignId: event.target.value,
              creativeId: ""
            }))
          }
        >
          {props.campaigns.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">素材（可选）</label>
        <select className="field" value={form.creativeId} onChange={(event) => setForm((current) => ({ ...current, creativeId: event.target.value }))}>
          <option value="">默认首个素材</option>
          {creativeOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.creativeName}
            </option>
          ))}
        </select>
      </div>
      <div className="xl:col-span-2">
        <label className="field-label">来源备注（可选）</label>
        <input className="field" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
      </div>
      <div className="xl:col-span-5">
        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "提交中..." : "写入系统内接量表"}
        </button>
      </div>
    </form>
  );
}
