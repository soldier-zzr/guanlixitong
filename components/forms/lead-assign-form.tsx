"use client";

import { LeadStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { formatUserOptionLabel } from "@/lib/utils";

type User = {
  id: string;
  name: string;
  title?: string | null;
  managerName?: string | null;
};

export function LeadAssignForm(props: {
  leadId: string;
  currentAssigneeId?: string | null;
  leadStatus: LeadStatus;
  users: User[];
  intentLevel?: string | null;
}) {
  const router = useRouter();
  const [assignedToId, setAssignedToId] = useState(props.currentAssigneeId ?? props.users[0]?.id ?? "");
  const [intentLevel, setIntentLevel] = useState(props.intentLevel ?? "待承接评估");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function assignLead() {
    setLoading(true);
    const response = await fetch(`/api/leads/${props.leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ASSIGN",
        assignedToId,
        intentLevel,
        note
      })
    });
    setLoading(false);
    if (!response.ok) {
      window.alert("分配失败");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function updateStatus(status: LeadStatus) {
    setLoading(true);
    const response = await fetch(`/api/leads/${props.leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_STATUS",
        leadStatus: status,
        intentLevel,
        note
      })
    });
    setLoading(false);
    if (!response.ok) {
      window.alert("更新状态失败");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <select className="field" value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}>
        {props.users.map((item) => (
          <option key={item.id} value={item.id}>
            {formatUserOptionLabel(item)}
          </option>
        ))}
      </select>
      <select className="field" value={intentLevel} onChange={(event) => setIntentLevel(event.target.value)}>
        <option value="待承接评估">待承接评估</option>
        <option value="高意向">高意向</option>
        <option value="中意向">中意向</option>
        <option value="低意向">低意向</option>
      </select>
      <textarea className="field min-h-24 py-3" placeholder="销售承接人员填写：是否加上、跟进情况、备注" value={note} onChange={(event) => setNote(event.target.value)} />
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" disabled={loading} onClick={assignLead} type="button">
          重新分配
        </button>
        <button className="btn-secondary" disabled={loading} onClick={() => updateStatus(LeadStatus.CONTACTED)} type="button">
          标记已联系
        </button>
        <button className="btn-secondary" disabled={loading} onClick={() => updateStatus(LeadStatus.WECHAT_ADDED)} type="button">
          标记已加V
        </button>
        <button className="btn-secondary" disabled={loading} onClick={() => updateStatus(LeadStatus.IN_GROUP)} type="button">
          标记已进群
        </button>
        <button className="btn-secondary" disabled={loading} onClick={() => updateStatus(LeadStatus.LOST)} type="button">
          标记流失
        </button>
      </div>
    </div>
  );
}
