"use client";

import { UserTitle } from "@prisma/client";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { userTitleLabelMap } from "@/lib/server/config";
import { formatUserOptionLabel } from "@/lib/utils";

type ManagerOption = {
  id: string;
  name: string;
  title?: string | null;
};

export function UserCreateForm(props: {
  managers: ManagerOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    password: string;
    title: UserTitle;
    managerId: string;
    active: boolean;
  }>({
    name: "",
    email: "",
    phone: "",
    password: "zf123456",
    title: UserTitle.SALES,
    managerId: "",
    active: true
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      window.alert(payload?.message ?? "新增账号失败");
      return;
    }

    setForm({
      name: "",
      email: "",
      phone: "",
      password: "zf123456",
      title: UserTitle.SALES,
      managerId: "",
      active: true
    });

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-7" onSubmit={onSubmit}>
      <div>
        <label className="field-label">姓名</label>
        <input
          className="field"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
      </div>
      <div>
        <label className="field-label">邮箱</label>
        <input
          className="field"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        />
      </div>
      <div>
        <label className="field-label">手机号</label>
        <input
          className="field"
          value={form.phone}
          onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
        />
      </div>
      <div>
        <label className="field-label">初始密码</label>
        <input
          className="field"
          type="password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        />
      </div>
      <div>
        <label className="field-label">岗位</label>
        <select
          className="field"
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              title: event.target.value as UserTitle
            }))
          }
        >
          {Object.entries(userTitleLabelMap).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">负责人</label>
        <select
          className="field"
          value={form.managerId}
          onChange={(event) =>
            setForm((current) => ({ ...current, managerId: event.target.value }))
          }
        >
          <option value="">无</option>
          {props.managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {formatUserOptionLabel(manager)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <button className="btn-primary w-full" disabled={loading} type="submit">
          {loading ? "创建中..." : "新增账号"}
        </button>
      </div>
    </form>
  );
}
