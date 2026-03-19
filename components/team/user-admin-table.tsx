"use client";

import { UserTitle } from "@prisma/client";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { userTitleLabelMap } from "@/lib/server/config";
import { formatUserOptionLabel } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  active: boolean;
  managerId?: string | null;
  manager?: {
    id: string;
    name: string;
    title?: string | null;
  } | null;
};

export function UserAdminTable(props: {
  users: UserRow[];
}) {
  const router = useRouter();
  const managerTitles: UserTitle[] = [
    UserTitle.SALES_MANAGER,
    UserTitle.PRIVATE_SUPERVISOR,
    UserTitle.DELIVERY_SUPERVISOR,
    UserTitle.ADMIN
  ];
  const managers = useMemo(
    () =>
      props.users.filter((user) => user.title && managerTitles.includes(user.title as UserTitle)),
    [managerTitles, props.users]
  );
  const [rows, setRows] = useState(
    props.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email ?? "",
      phone: user.phone ?? "",
      password: "",
      title: (user.title as UserTitle | null) ?? UserTitle.SALES,
      managerId: user.managerId ?? "",
      active: user.active
    }))
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  function updateRow(id: string, patch: Partial<(typeof rows)[number]>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  async function saveRow(id: string) {
    const row = rows.find((item) => item.id === id);
    if (!row) {
      return;
    }

    setSavingId(id);
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row)
    });
    setSavingId(null);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      window.alert(payload?.message ?? "账号保存失败");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="table-shell overflow-x-auto">
      <table className="min-w-[1440px]">
        <thead>
          <tr>
            <th>姓名</th>
            <th>岗位</th>
            <th>负责人</th>
            <th>邮箱</th>
            <th>手机号</th>
            <th>重置密码</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {props.users.map((user) => {
            const row = rows.find((item) => item.id === user.id);
            if (!row) {
              return null;
            }

            return (
              <tr key={user.id}>
                <td>
                  <input
                    className="field h-10 min-w-[160px] rounded-xl px-3"
                    value={row.name}
                    onChange={(event) => updateRow(user.id, { name: event.target.value })}
                  />
                </td>
                <td>
                  <select
                    className="field h-10 min-w-[180px] rounded-xl px-3"
                    value={row.title ?? UserTitle.SALES}
                    onChange={(event) =>
                      updateRow(user.id, { title: event.target.value as UserTitle })
                    }
                  >
                    {Object.entries(userTitleLabelMap).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="min-w-[190px] space-y-2">
                    <div className="text-xs text-slate-500">
                      {user.manager ? formatUserOptionLabel(user.manager) : "无"}
                    </div>
                    <select
                      className="field h-10 rounded-xl px-3"
                      value={row.managerId}
                      onChange={(event) =>
                        updateRow(user.id, { managerId: event.target.value })
                      }
                    >
                      <option value="">无</option>
                      {managers
                        .filter((manager) => manager.id !== user.id)
                        .map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {formatUserOptionLabel(manager)}
                          </option>
                        ))}
                    </select>
                  </div>
                </td>
                <td>
                  <input
                    className="field h-10 min-w-[220px] rounded-xl px-3"
                    value={row.email}
                    onChange={(event) => updateRow(user.id, { email: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="field h-10 min-w-[160px] rounded-xl px-3"
                    value={row.phone}
                    onChange={(event) => updateRow(user.id, { phone: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="field h-10 min-w-[160px] rounded-xl px-3"
                    placeholder="留空则不修改"
                    type="password"
                    value={row.password}
                    onChange={(event) => updateRow(user.id, { password: event.target.value })}
                  />
                </td>
                <td>
                  <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input
                      checked={row.active}
                      onChange={(event) => updateRow(user.id, { active: event.target.checked })}
                      type="checkbox"
                    />
                    {row.active ? "启用" : "停用"}
                  </label>
                </td>
                <td>
                  <button
                    className="btn-primary h-10 rounded-xl px-4"
                    disabled={savingId === user.id}
                    onClick={() => saveRow(user.id)}
                    type="button"
                  >
                    {savingId === user.id ? "保存中..." : "保存"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
