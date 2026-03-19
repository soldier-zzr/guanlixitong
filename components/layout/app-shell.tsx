import { ReactNode } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { getCurrentActorContext } from "@/lib/server/actor";

export async function AppShell({ children }: { children: ReactNode }) {
  const { actor, sessionPermissions, sessionUser, users, permissions } = await getCurrentActorContext();

  if (!sessionUser) {
    return <div className="min-h-screen bg-dashboard-glow">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-dashboard-glow">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-4 px-3 py-3 sm:gap-5 sm:px-4 sm:py-4 lg:gap-6 lg:px-6">
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <SidebarNav
            actor={actor}
            permissions={permissions}
            sessionPermissions={sessionPermissions}
            sessionUser={sessionUser}
            users={users}
          />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
