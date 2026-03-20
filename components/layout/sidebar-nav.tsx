"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CircleDollarSign,
  Filter,
  LayoutDashboard,
  ListTodo,
  RefreshCw,
  ShieldCheck,
  Settings2,
  Users
} from "lucide-react";
import { ActorSwitcher } from "@/components/layout/actor-switcher";
import { BrandBlock } from "@/components/layout/brand-block";
import { cn, formatUserOptionLabel } from "@/lib/utils";

const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/marketing", label: "投放录入", icon: BriefcaseBusiness },
  { href: "/leads", label: "销售承接", icon: ListTodo },
  { href: "/funnel", label: "销售漏斗", icon: Filter },
  { href: "/students", label: "学员管理", icon: Users },
  { href: "/risk", label: "风险预警", icon: AlertTriangle },
  { href: "/refunds", label: "退款工作台", icon: RefreshCw },
  { href: "/analytics", label: "ROI 分析", icon: CircleDollarSign },
  { href: "/account", label: "账号设置", icon: ShieldCheck }
];

export function SidebarNav(props: {
  actor: {
    id: string;
    name: string;
    role: string;
    title?: string | null;
    active: boolean;
  } | null;
  sessionUser: {
    id: string;
    name: string;
    role: string;
    title?: string | null;
    active: boolean;
  };
  sessionPermissions: {
    canManageTeam: boolean;
  };
  permissions: {
    canManageTeam: boolean;
    canInputLeads: boolean;
    canHandleLeads: boolean;
    canCreateStudents: boolean;
    canCreateRiskEvents: boolean;
    canProcessRefunds: boolean;
  };
  users: Array<{
    id: string;
    name: string;
    role?: string;
    title?: string | null;
    managerName?: string | null;
  }>;
}) {
  const pathname = usePathname();
  const currentNavItems = navItems
    .filter((item) => {
      if (item.href === "/marketing") {
        return props.permissions.canInputLeads || props.permissions.canHandleLeads || props.permissions.canCreateStudents;
      }
      if (item.href === "/leads") {
        return props.permissions.canInputLeads || props.permissions.canHandleLeads;
      }
      if (item.href === "/funnel" || item.href === "/students") {
        return props.permissions.canHandleLeads || props.permissions.canCreateStudents;
      }
      if (item.href === "/risk") {
        return props.permissions.canCreateRiskEvents;
      }
      if (item.href === "/refunds" || item.href === "/analytics") {
        return props.permissions.canProcessRefunds;
      }
      return true;
    })
    .concat(props.permissions.canManageTeam ? [{ href: "/team", label: "账号管理", icon: Settings2 }] : []);

  return (
    <div className="panel-dark sticky top-4 flex h-[calc(100vh-2rem)] flex-col overflow-hidden px-5 py-6">
      <div className="border-b border-white/10 pb-6">
        <BrandBlock
          dark
          stacked
          description="聚焦线索承接、报课转化、退款审批与净收入管理。"
        />
      </div>

      <div className="mt-6">
        <ActorSwitcher
          canSwitch={props.sessionPermissions.canManageTeam}
          currentActorId={props.actor?.id}
          currentLabel={
            props.actor && props.actor.id !== props.sessionUser.id
              ? `${formatUserOptionLabel(props.sessionUser)} -> ${formatUserOptionLabel(props.actor)}`
              : formatUserOptionLabel(props.sessionUser)
          }
          users={props.users}
        />
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
        <nav className="flex flex-col gap-2">
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-brand-600 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-3xl border border-brand-500/30 bg-brand-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-2">
              <BarChart3 className="h-4 w-4 text-brand-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">经营视角</p>
              <p className="text-xs leading-5 text-slate-300">
                所有退款影响都会回写到期次 ROI 与责任归因。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
