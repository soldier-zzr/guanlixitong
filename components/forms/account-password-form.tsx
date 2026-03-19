"use client";

import { useState } from "react";

export function AccountPasswordForm() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      window.alert("请填写完整密码信息");
      return;
    }

    if (form.newPassword.length < 6) {
      window.alert("新密码至少 6 位");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      window.alert("两次输入的新密码不一致");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    setSaving(false);

    if (!response.ok) {
      window.alert(payload?.message ?? "密码修改失败");
      return;
    }

    setForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    window.alert("密码已更新");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="field-label">当前密码</label>
        <input
          className="field"
          type="password"
          value={form.currentPassword}
          onChange={(event) =>
            setForm((current) => ({ ...current, currentPassword: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">新密码</label>
        <input
          className="field"
          type="password"
          value={form.newPassword}
          onChange={(event) =>
            setForm((current) => ({ ...current, newPassword: event.target.value }))
          }
        />
      </div>
      <div>
        <label className="field-label">确认新密码</label>
        <input
          className="field"
          type="password"
          value={form.confirmPassword}
          onChange={(event) =>
            setForm((current) => ({ ...current, confirmPassword: event.target.value }))
          }
        />
      </div>
      <button className="btn-primary h-11 rounded-2xl px-5" disabled={saving} type="submit">
        {saving ? "保存中..." : "更新密码"}
      </button>
    </form>
  );
}
