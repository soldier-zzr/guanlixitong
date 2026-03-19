"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { formatUserOptionLabel } from "@/lib/utils";

type Option = {
  id: string;
  name: string;
  role?: string;
  code?: string;
  title?: string | null;
  managerName?: string | null;
};

export function StudentCreateForm(props: {
  cohorts: Option[];
  users: Option[];
}) {
  const router = useRouter();
  const salesUsers = props.users.filter(
    (item) => item.title === "SALES" || item.title === "PRIVATE_OPS"
  );
  const deliveryUsers = props.users.filter((item) => item.role === "DELIVERY");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    sourceCampaign: "",
    cohortId: props.cohorts[0]?.id ?? "",
    salesOwnerId: salesUsers[0]?.id ?? "",
    deliveryOwnerId: deliveryUsers[0]?.id ?? "",
    lowPricePurchaseAt: "",
    wechatAddedAt: "",
    publicCourseJoinedAt: "",
    seatCardAmount: "980",
    finalPaymentAmount: "0"
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    setLoading(false);
    if (!response.ok) {
      window.alert("新增学员失败");
      return;
    }

    setForm({
      name: "",
      phone: "",
      city: "",
      sourceCampaign: "",
      cohortId: props.cohorts[0]?.id ?? "",
      salesOwnerId: salesUsers[0]?.id ?? "",
      deliveryOwnerId: deliveryUsers[0]?.id ?? "",
      lowPricePurchaseAt: "",
      wechatAddedAt: "",
      publicCourseJoinedAt: "",
      seatCardAmount: "980",
      finalPaymentAmount: "0"
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={onSubmit}>
      <div>
        <label className="field-label">学员姓名</label>
        <input
          className="field"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="例如：林悦"
        />
      </div>
      <div>
        <label className="field-label">手机号</label>
        <input
          className="field"
          value={form.phone}
          onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          placeholder="13800000000"
        />
      </div>
      <div>
        <label className="field-label">城市</label>
        <input
          className="field"
          value={form.city}
          onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
        />
      </div>
      <div>
        <label className="field-label">来源活动</label>
        <input
          className="field"
          value={form.sourceCampaign}
          onChange={(event) =>
            setForm((current) => ({ ...current, sourceCampaign: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">期次</label>
        <select
          className="field"
          value={form.cohortId}
          onChange={(event) => setForm((current) => ({ ...current, cohortId: event.target.value }))}
        >
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
          {deliveryUsers.map((item) => (
            <option key={item.id} value={item.id}>
              {formatUserOptionLabel(item)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">低价课购买时间</label>
        <input
          className="field"
          type="datetime-local"
          value={form.lowPricePurchaseAt}
          onChange={(event) =>
            setForm((current) => ({ ...current, lowPricePurchaseAt: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">加企微时间</label>
        <input
          className="field"
          type="datetime-local"
          value={form.wechatAddedAt}
          onChange={(event) =>
            setForm((current) => ({ ...current, wechatAddedAt: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">公开课参与时间</label>
        <input
          className="field"
          type="datetime-local"
          value={form.publicCourseJoinedAt}
          onChange={(event) =>
            setForm((current) => ({ ...current, publicCourseJoinedAt: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">占位卡金额</label>
        <input
          className="field"
          type="number"
          value={form.seatCardAmount}
          onChange={(event) =>
            setForm((current) => ({ ...current, seatCardAmount: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">尾款金额</label>
        <input
          className="field"
          type="number"
          value={form.finalPaymentAmount}
          onChange={(event) =>
            setForm((current) => ({ ...current, finalPaymentAmount: event.target.value }))
          }
        />
      </div>
      <div className="flex items-end">
        <button className="btn-primary w-full" disabled={loading} type="submit">
          {loading ? "保存中..." : "新增学员并建立成交记录"}
        </button>
      </div>
    </form>
  );
}
