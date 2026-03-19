"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandBlock } from "@/components/layout/brand-block";

export function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    login: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    setLoading(false);

    if (!response.ok) {
      window.alert(payload?.message ?? "登录失败");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form className="panel mx-auto max-w-[460px] space-y-5 px-6 py-8" onSubmit={onSubmit}>
      <BrandBlock
        compact
        eyebrow="Team Login"
        title="登录珠峰学员管理系统"
        description="使用手机号或邮箱登录。登录后系统会按岗位自动限制可编辑字段和退款流程动作。"
        logoSrc="/branding/zhufeng-logo-black.png"
      />

      <div>
        <label className="field-label">手机号或邮箱</label>
        <input
          autoComplete="username"
          className="field"
          placeholder="例如：13800138000"
          value={form.login}
          onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))}
        />
      </div>

      <div>
        <label className="field-label">密码</label>
        <input
          autoComplete="current-password"
          className="field"
          placeholder="请输入密码"
          type="password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        />
      </div>

      <button className="btn-primary w-full" disabled={loading} type="submit">
        {loading ? "登录中..." : "登录系统"}
      </button>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        原型默认账号示例：
        <br />
        管理员 `13900000001`
        <br />
        默认密码 `zf123456`
      </div>
    </form>
  );
}
