"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { formatUserOptionLabel } from "@/lib/utils";

type ActorOption = {
  id: string;
  name: string;
  role?: string;
  title?: string | null;
  managerName?: string | null;
};

export function ActorSwitcher(props: {
  users: ActorOption[];
  currentActorId?: string | null;
  currentLabel: string;
  canSwitch: boolean;
}) {
  const router = useRouter();
  const [actorId, setActorId] = useState(props.currentActorId ?? props.users[0]?.id ?? "");
  const [loading, setLoading] = useState(false);

  async function switchActor(nextActorId: string) {
    setActorId(nextActorId);
    setLoading(true);
    const response = await fetch("/api/session/actor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: nextActorId })
    });
    setLoading(false);

    if (!response.ok) {
      window.alert("切换账号失败");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  async function logout() {
    setLoading(true);
    await fetch("/api/session/logout", {
      method: "POST"
    });
    setLoading(false);
    window.location.href = "/login";
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">当前登录</p>
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-white">
        {props.currentLabel}
      </div>
      {props.canSwitch ? (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">管理员代入视角</p>
          <select
            className="field mt-3 h-11 border-white/10 bg-white/10 text-white"
            disabled={loading}
            value={actorId}
            onChange={(event) => switchActor(event.target.value)}
          >
            {props.users.map((user) => (
              <option key={user.id} value={user.id}>
                {formatUserOptionLabel(user)}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <p className="mt-2 text-xs leading-5 text-slate-300">
        {props.canSwitch
          ? "管理员可切换代入视角，检查不同岗位下的页面权限。"
          : "系统会按你的岗位自动限制可编辑字段和流程动作。"}
      </p>
      <button
        className="btn-secondary mt-4 w-full border-white/10 bg-white/10 text-white hover:bg-white/15"
        disabled={loading}
        onClick={logout}
        type="button"
      >
        退出登录
      </button>
    </div>
  );
}
