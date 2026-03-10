import { ReactNode } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-dashboard-glow">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <SidebarNav />
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
