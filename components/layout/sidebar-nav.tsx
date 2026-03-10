"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Filter,
  FolderSync,
  LayoutDashboard,
  ListTodo,
  RefreshCw,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/imports", label: "报表整合", icon: FolderSync },
  { href: "/leads", label: "线索池", icon: ListTodo },
  { href: "/funnel", label: "销售漏斗", icon: Filter },
  { href: "/students", label: "学员管理", icon: Users },
  { href: "/risk", label: "风险预警", icon: AlertTriangle },
  { href: "/refunds", label: "退款工作台", icon: RefreshCw },
  { href: "/analytics", label: "ROI 分析", icon: CircleDollarSign }
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="panel-dark sticky top-4 flex h-[calc(100vh-2rem)] flex-col overflow-hidden px-5 py-6">
      <div className="border-b border-white/10 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">
          Refund Risk OS
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          密训课程退款风控系统
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          聚焦晚退费预防、分层处理与净 ROI 管理。
        </p>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
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

      <div className="rounded-3xl border border-brand-500/30 bg-brand-500/10 p-4">
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
  );
}
