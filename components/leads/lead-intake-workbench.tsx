"use client";

import { LeadStatus } from "@prisma/client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LeadAssignForm } from "@/components/forms/lead-assign-form";
import { LeadStatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/utils";

type SalesUser = {
  id: string;
  name: string;
  title?: string | null;
};

type LeadRow = {
  id: string;
  name: string;
  phone: string;
  sourceTime: string | Date;
  orderInfo?: string | null;
  intentLevel?: string | null;
  note?: string | null;
  leadStatus: LeadStatus;
  currentAssigneeId?: string | null;
  currentAssignee?: { name: string } | null;
  student?: { id: string } | null;
};

export function LeadIntakeWorkbench(props: {
  leads: LeadRow[];
  users: SalesUser[];
  canEdit: boolean;
  canReassign: boolean;
}) {
  const [selectedLeadId, setSelectedLeadId] = useState(props.leads[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [listMode, setListMode] = useState<"ALL" | "PENDING" | "STUDENT">("ALL");

  const filteredLeads = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return props.leads.filter((lead) => {
      const matchesKeyword =
        keyword.length === 0 ||
        lead.name.toLowerCase().includes(keyword) ||
        lead.phone.includes(keyword);

      const matchesMode =
        listMode === "ALL"
          ? true
          : listMode === "PENDING"
            ? !lead.student
            : Boolean(lead.student);

      return matchesKeyword && matchesMode;
    });
  }, [listMode, props.leads, search]);

  const selectedLead = useMemo(
    () => filteredLeads.find((lead) => lead.id === selectedLeadId) ?? filteredLeads[0] ?? null,
    [filteredLeads, selectedLeadId]
  );

  if (!selectedLead) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
        当前筛选条件下没有可承接线索。
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[320px,1fr]">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-slate-950">待填写名单</h4>
          <p className="mt-1 text-sm leading-6 text-slate-500">先点左侧某个人，再在右侧集中填写承接信息。</p>
        </div>
        <div className="mb-4 space-y-3">
          <input
            className="field"
            placeholder="搜索昵称或手机号"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {[
              { value: "ALL", label: `全部 ${props.leads.length}` },
              {
                value: "PENDING",
                label: `待建档 ${props.leads.filter((lead) => !lead.student).length}`
              },
              {
                value: "STUDENT",
                label: `已转学员 ${props.leads.filter((lead) => lead.student).length}`
              }
            ].map((option) => {
              const isActive = listMode === option.value;
              return (
                <button
                  key={option.value}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-brand-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                  onClick={() => setListMode(option.value as typeof listMode)}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-3">
          {filteredLeads.map((lead) => {
            const isActive = lead.id === selectedLead.id;
            return (
              <button
                key={lead.id}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-brand-300 bg-brand-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                onClick={() => setSelectedLeadId(lead.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                      <p className="font-semibold text-slate-950">{lead.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{lead.phone}</p>
                    </div>
                  <LeadStatusBadge status={lead.leadStatus} />
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {lead.currentAssignee?.name ?? "未分配"} · {lead.intentLevel ?? "待承接评估"} ·{" "}
                  {lead.orderInfo ?? "未填订单信息"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h4 className="text-xl font-semibold text-slate-950">{selectedLead.name}</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {selectedLead.phone} · 进线时间 {formatDateTime(selectedLead.sourceTime)}
            </p>
            <p className="text-sm leading-6 text-slate-500">
              当前负责人 {selectedLead.currentAssignee?.name ?? "未分配"} · 订单信息 {selectedLead.orderInfo ?? "未填写"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LeadStatusBadge status={selectedLead.leadStatus} />
            {selectedLead.student ? (
              <Link
                className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                href={`/students/${selectedLead.student.id}`}
              >
                查看学员详情
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">订单信息</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{selectedLead.orderInfo ?? "未填写"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">当前意向</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{selectedLead.intentLevel ?? "待承接评估"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">承接备注</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{selectedLead.note ?? "暂无备注"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <h5 className="text-base font-semibold text-slate-950">销售承接填写</h5>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            这一栏只针对当前选中的这个人填写。状态、备注、负责人都围绕右侧这个人集中处理。
          </p>
          <div className="mt-4">
            <LeadAssignForm
              key={selectedLead.id}
              canEdit={props.canEdit}
              canReassign={props.canReassign}
              currentAssigneeId={selectedLead.currentAssigneeId}
              currentAssigneeName={selectedLead.currentAssignee?.name ?? null}
              intentLevel={selectedLead.intentLevel}
              leadId={selectedLead.id}
              leadStatus={selectedLead.leadStatus}
              users={props.users}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
