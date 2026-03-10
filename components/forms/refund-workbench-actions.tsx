"use client";

import { RefundLevel, RefundStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { formatUserOptionLabel } from "@/lib/utils";

export function RefundWorkbenchActions(props: {
  refundRequestId: string;
  currentLevel: RefundLevel;
  status: RefundStatus;
  actorId?: string | null;
  users: Array<{ id: string; name: string; title?: string | null; managerName?: string | null }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState("");
  const [actorId, setActorId] = useState(props.actorId ?? props.users[0]?.id ?? "");

  async function submitAction(
    action: "ESCALATE" | "RETAIN" | "REFUND" | "CLOSE" | "APPROVE" | "REJECT_APPROVAL"
  ) {
    setLoading(true);
    const response = await fetch(`/api/refund-requests/${props.refundRequestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        actorId,
        currentLevel: props.currentLevel,
        status: props.status,
        note,
        evidenceUrls
      })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      window.alert(data.message || "操作失败");
      return;
    }

    setNote("");
    setEvidenceUrls("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <select className="field" value={actorId} onChange={(event) => setActorId(event.target.value)}>
        {props.users.map((user) => (
          <option key={user.id} value={user.id}>
            {formatUserOptionLabel(user)}
          </option>
        ))}
      </select>
      <textarea
        className="field min-h-24 py-3"
        placeholder="记录本次处理动作、用户反馈、升级原因或同意/不同意退款的理由"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <input
        className="field"
        placeholder="处理对话截图或资料链接，多个可用逗号分隔"
        value={evidenceUrls}
        onChange={(event) => setEvidenceUrls(event.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <button className="btn-secondary" disabled={loading} onClick={() => submitAction("APPROVE")} type="button">
          提交同意
        </button>
        <button className="btn-secondary" disabled={loading} onClick={() => submitAction("REJECT_APPROVAL")} type="button">
          不同意退款
        </button>
        <button className="btn-secondary" disabled={loading} onClick={() => submitAction("ESCALATE")} type="button">
          升级处理
        </button>
        <button className="btn-primary" disabled={loading} onClick={() => submitAction("RETAIN")} type="button">
          登记挽回
        </button>
        <button className="btn-secondary border-rose-200 text-rose-700 hover:border-rose-300 hover:text-rose-800" disabled={loading} onClick={() => submitAction("REFUND")} type="button">
          确认退款
        </button>
        <button className="btn-secondary" disabled={loading} onClick={() => submitAction("CLOSE")} type="button">
          结案
        </button>
      </div>
    </div>
  );
}
