"use client";

import { RefundApprovalDecision, RefundLevel, RefundStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

export function RefundWorkbenchActions(props: {
  refundRequestId: string;
  currentLevel: RefundLevel;
  status: RefundStatus;
  actorId?: string | null;
  actorLabel: string;
  canProcess: boolean;
  currentHandlerId?: string | null;
  actorApprovalDecision?: RefundApprovalDecision | null;
  allApprovalsApproved: boolean;
  pendingApproverNames: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState("");
  const actorId = props.actorId ?? "";
  const isClosed = props.status === RefundStatus.CLOSED;
  const isCurrentHandler = Boolean(actorId && props.currentHandlerId === actorId);
  const isPendingApprover = props.actorApprovalDecision === RefundApprovalDecision.PENDING;
  const canApprove = props.canProcess && isPendingApprover && !isClosed;
  const canHandle =
    props.canProcess &&
    isCurrentHandler &&
    props.status !== RefundStatus.REFUNDED &&
    props.status !== RefundStatus.CLOSED &&
    props.status !== RefundStatus.RETAINED;
  const canEscalate = canHandle && props.currentLevel !== RefundLevel.LEVEL3;
  const canRetain = canHandle;
  const canRefund = canHandle && props.allApprovalsApproved;
  const canClose = props.canProcess && isCurrentHandler && props.status !== RefundStatus.CLOSED;
  const identityTags = [
    isCurrentHandler ? "当前处理人" : null,
    isPendingApprover ? "待审批人" : null,
    props.actorApprovalDecision === RefundApprovalDecision.APPROVED ? "已同意退款" : null,
    props.actorApprovalDecision === RefundApprovalDecision.REJECTED ? "已拒绝退款" : null
  ].filter(Boolean) as string[];
  const blockedReasons = [
    !props.canProcess ? "当前岗位只有查看权限，不能处理退款。" : null,
    props.canProcess && !isCurrentHandler && !isPendingApprover
      ? "当前账号既不是处理人，也不在审批节点里。"
      : null,
    props.canProcess && isCurrentHandler && !props.allApprovalsApproved
      ? "确认退款前，还需要所有同意节点完成。"
      : null,
    props.canProcess && isPendingApprover
      ? "你当前在审批节点里，可以先提交同意或不同意退款。"
      : null
  ].filter(Boolean) as string[];

  async function submitAction(
    action: "ESCALATE" | "RETAIN" | "REFUND" | "CLOSE" | "APPROVE" | "REJECT_APPROVAL"
  ) {
    if (!props.canProcess) {
      window.alert("当前岗位没有退款处理权限");
      return;
    }

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
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        当前处理账号：<span className="font-semibold text-slate-900">{props.actorLabel}</span>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <div className="flex flex-wrap items-center gap-2">
          <span>当前身份：</span>
          {identityTags.length > 0 ? (
            identityTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-slate-500">仅查看</span>
          )}
        </div>
        <p className="mt-2 leading-6 text-slate-500">
          {props.allApprovalsApproved
            ? "当前退款同意节点已全部完成。"
            : props.pendingApproverNames.length > 0
              ? `还差这些人同意：${props.pendingApproverNames.join("、")}`
              : "当前没有待审批节点。"}
        </p>
      </div>
      <textarea
        className="field min-h-24 py-3"
        disabled={!props.canProcess}
        placeholder="记录本次处理动作、用户反馈、升级原因或同意/不同意退款的理由"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <input
        className="field"
        disabled={!props.canProcess}
        placeholder="处理对话截图或资料链接，多个可用逗号分隔"
        value={evidenceUrls}
        onChange={(event) => setEvidenceUrls(event.target.value)}
      />
      {!props.canProcess ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          当前岗位仅可查看退款进展，不能执行审批、升级、挽回或确认退款。
        </div>
      ) : null}
      {props.canProcess && !isCurrentHandler && !isPendingApprover ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          当前账号不是本单处理人，也不在待审批节点中，所以这里只能查看进度。
        </div>
      ) : null}
      {props.canProcess && isCurrentHandler && !props.allApprovalsApproved ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          退款前还需要完成所有同意节点。当前处理人可以先升级、挽回或等待审批完成。
        </div>
      ) : null}
      {blockedReasons.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {blockedReasons.map((reason) => (
            <p key={reason} className="leading-6">
              {reason}
            </p>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button className="btn-secondary" disabled={loading || !canApprove} onClick={() => submitAction("APPROVE")} type="button">
          提交同意
        </button>
        <button className="btn-secondary" disabled={loading || !canApprove} onClick={() => submitAction("REJECT_APPROVAL")} type="button">
          不同意退款
        </button>
        <button className="btn-secondary" disabled={loading || !canEscalate} onClick={() => submitAction("ESCALATE")} type="button">
          升级处理
        </button>
        <button className="btn-primary" disabled={loading || !canRetain} onClick={() => submitAction("RETAIN")} type="button">
          登记挽回
        </button>
        <button className="btn-secondary border-rose-200 text-rose-700 hover:border-rose-300 hover:text-rose-800" disabled={loading || !canRefund} onClick={() => submitAction("REFUND")} type="button">
          确认退款
        </button>
        <button className="btn-secondary" disabled={loading || !canClose} onClick={() => submitAction("CLOSE")} type="button">
          结案
        </button>
      </div>
    </div>
  );
}
