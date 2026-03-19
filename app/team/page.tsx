import { UserTitle } from "@prisma/client";
import { UserCreateForm } from "@/components/forms/user-create-form";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/section-card";
import { UserAdminTable } from "@/components/team/user-admin-table";
import { requireCurrentActorContext } from "@/lib/server/actor";
import { userTitleLabelMap } from "@/lib/server/config";
import { prisma } from "@/lib/server/db";

export default async function TeamPage() {
  const { permissions } = await requireCurrentActorContext();

  if (!permissions.canManageTeam) {
    return (
      <div className="space-y-6 py-4">
        <PageHeader
          eyebrow="Team"
          title="账号与岗位定义"
          description="当前岗位没有账号管理权限。请切换为管理员后再维护岗位与账号。"
        />
      </div>
    );
  }

  const users = await prisma.user.findMany({
    include: {
      manager: {
        select: {
          id: true,
          name: true,
          title: true
        }
      }
    },
    orderBy: [{ active: "desc" }, { title: "asc" }, { name: "asc" }]
  });

  const managerTitles: UserTitle[] = [
    UserTitle.ADMIN,
    UserTitle.SALES_MANAGER,
    UserTitle.PRIVATE_SUPERVISOR,
    UserTitle.DELIVERY_SUPERVISOR
  ];
  const managers = users.filter((user) => user.title && managerTitles.includes(user.title));

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Team"
        title="账号与岗位定义"
        description="在线维护岗位、负责人、手机号和登录密码，不再依赖 seed 手工修改。"
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Object.entries(userTitleLabelMap).map(([value, label]) => (
          <SectionCard key={value} title={label} subtitle="当前人数">
            <p className="text-3xl font-semibold text-slate-950">
              {users.filter((user) => user.title === value).length}
            </p>
          </SectionCard>
        ))}
      </div>

      <SectionCard title="新增账号" subtitle="创建后即可用手机号和初始密码登录，系统会自动映射底层角色。">
        <UserCreateForm
          managers={managers.map((manager) => ({
            id: manager.id,
            name: manager.name,
            title: manager.title
          }))}
        />
      </SectionCard>

      <SectionCard title="账号台账" subtitle="支持在线修改岗位、负责人、联系方式、启停状态和重置密码。">
        <UserAdminTable users={users} />
      </SectionCard>
    </div>
  );
}
