import { UserTitle, type User } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTOR_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { ensureDatabaseReady, prisma } from "@/lib/server/db";

const teamManagementTitles = [UserTitle.ADMIN];
const leadIntakeTitles = [
  UserTitle.ADMIN,
  UserTitle.MARKETING,
  UserTitle.PRIVATE_OPS,
  UserTitle.PRIVATE_SUPERVISOR
];
const leadFollowTitles = [
  UserTitle.ADMIN,
  UserTitle.SALES_MANAGER,
  UserTitle.SALES,
  UserTitle.PRIVATE_OPS,
  UserTitle.PRIVATE_SUPERVISOR
];
const leadReassignTitles = [UserTitle.ADMIN, UserTitle.SALES_MANAGER, UserTitle.PRIVATE_SUPERVISOR];
const studentSalesTitles = [
  UserTitle.ADMIN,
  UserTitle.SALES_MANAGER,
  UserTitle.SALES,
  UserTitle.PRIVATE_SUPERVISOR
];
const studentDeliveryTitles = [
  UserTitle.ADMIN,
  UserTitle.SALES_MANAGER,
  UserTitle.DELIVERY_OPS,
  UserTitle.DELIVERY_SUPERVISOR
];
const refundTitles = [
  UserTitle.ADMIN,
  UserTitle.SALES_MANAGER,
  UserTitle.SALES,
  UserTitle.PRIVATE_OPS,
  UserTitle.PRIVATE_SUPERVISOR,
  UserTitle.DELIVERY_OPS,
  UserTitle.DELIVERY_SUPERVISOR
];
const riskTitles = refundTitles;
const cohortTitles = [UserTitle.ADMIN, UserTitle.SALES_MANAGER, UserTitle.PRIVATE_SUPERVISOR];

export type ActiveActor = Pick<User, "id" | "name" | "role" | "title" | "active">;

export type ActorPermissions = ReturnType<typeof getActorPermissions>;
export type DataScope = {
  isGlobal: boolean;
  scopeLabel: string;
  sourceUserIds: string[];
  salesUserIds: string[];
  deliveryUserIds: string[];
};

function hasTitle(title: UserTitle | null | undefined, titles: UserTitle[]) {
  return Boolean(title && titles.includes(title));
}

export function getActorPermissions(title: UserTitle | null | undefined) {
  return {
    canManageTeam: hasTitle(title, teamManagementTitles),
    canInputLeads: hasTitle(title, leadIntakeTitles),
    canHandleLeads: hasTitle(title, leadFollowTitles),
    canReassignLeads: hasTitle(title, leadReassignTitles),
    canCreateStudents: hasTitle(title, studentSalesTitles),
    canEditStudentSales: hasTitle(title, studentSalesTitles),
    canEditStudentDelivery: hasTitle(title, studentDeliveryTitles),
    canManageCohorts: hasTitle(title, cohortTitles),
    canCreateRiskEvents: hasTitle(title, riskTitles),
    canCreateRefundRequests: hasTitle(title, refundTitles),
    canProcessRefunds: hasTitle(title, refundTitles)
  };
}

export async function getActiveUsers() {
  await ensureDatabaseReady();
  return prisma.user.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      role: true,
      title: true,
      email: true,
      phone: true,
      managerId: true,
      active: true
    },
    orderBy: [{ role: "asc" }, { name: "asc" }]
  });
}

function buildDataScope(
  actor: (Awaited<ReturnType<typeof getActiveUsers>>)[number] | null,
  users: Awaited<ReturnType<typeof getActiveUsers>>
): DataScope {
  if (!actor?.title) {
    return {
      isGlobal: false,
      scopeLabel: "未登录视角",
      sourceUserIds: [],
      salesUserIds: [],
      deliveryUserIds: []
    };
  }

  const directReports = users.filter((user) => user.managerId === actor.id);
  const salesTeamTitles: UserTitle[] = [UserTitle.SALES, UserTitle.PRIVATE_OPS];
  const deliveryTeamTitles: UserTitle[] = [UserTitle.DELIVERY_OPS];

  if (actor.title === UserTitle.ADMIN) {
    return {
      isGlobal: true,
      scopeLabel: "全局视角",
      sourceUserIds: users
        .filter((user) => user.title === UserTitle.MARKETING)
        .map((user) => user.id),
      salesUserIds: users
        .filter((user) => user.title === UserTitle.SALES || user.title === UserTitle.PRIVATE_OPS)
        .map((user) => user.id),
      deliveryUserIds: users.filter((user) => user.role === "DELIVERY").map((user) => user.id)
    };
  }

  if (actor.title === UserTitle.MARKETING) {
    return {
      isGlobal: false,
      scopeLabel: `${actor.name}投放视角`,
      sourceUserIds: [actor.id],
      salesUserIds: [],
      deliveryUserIds: []
    };
  }

  if (actor.title === UserTitle.SALES_MANAGER || actor.title === UserTitle.PRIVATE_SUPERVISOR) {
    return {
      isGlobal: false,
      scopeLabel: `${actor.name}团队视角`,
      sourceUserIds: [],
      salesUserIds: directReports
        .filter((user) => user.title && salesTeamTitles.includes(user.title))
        .map((user) => user.id),
      deliveryUserIds: []
    };
  }

  if (actor.title === UserTitle.DELIVERY_SUPERVISOR) {
    return {
      isGlobal: false,
      scopeLabel: `${actor.name}团队视角`,
      sourceUserIds: [],
      salesUserIds: [],
      deliveryUserIds: directReports
        .filter((user) => user.title && deliveryTeamTitles.includes(user.title))
        .map((user) => user.id)
    };
  }

  if (actor.title === UserTitle.DELIVERY_OPS) {
    return {
      isGlobal: false,
      scopeLabel: `${actor.name}个人视角`,
      sourceUserIds: [],
      salesUserIds: [],
      deliveryUserIds: [actor.id]
    };
  }

  return {
    isGlobal: false,
    scopeLabel: `${actor.name}个人视角`,
    sourceUserIds: [],
    salesUserIds: [actor.id],
    deliveryUserIds: []
  };
}

export async function getSessionUser() {
  const users = await getActiveUsers();
  const cookieStore = await cookies();
  const sessionUserId = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  return users.find((user) => user.id === sessionUserId) ?? null;
}

export async function getCurrentActor() {
  const users = await getActiveUsers();
  const cookieStore = await cookies();
  const sessionUserId = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  const actorId = cookieStore.get(ACTOR_COOKIE_NAME)?.value ?? null;
  const sessionUser = users.find((user) => user.id === sessionUserId) ?? null;

  if (!sessionUser) {
    return null;
  }

  if (getActorPermissions(sessionUser.title).canManageTeam && actorId) {
    return users.find((user) => user.id === actorId) ?? sessionUser;
  }

  return sessionUser;
}

export async function getCurrentActorContext() {
  const users = await getActiveUsers();
  const cookieStore = await cookies();
  const sessionUserId = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  const actorId = cookieStore.get(ACTOR_COOKIE_NAME)?.value ?? null;
  const sessionUser = users.find((user) => user.id === sessionUserId) ?? null;
  const sessionPermissions = getActorPermissions(sessionUser?.title ?? null);
  const actor =
    sessionUser && sessionPermissions.canManageTeam && actorId
      ? users.find((user) => user.id === actorId) ?? sessionUser
      : sessionUser;
  const actorPermissions = getActorPermissions(actor?.title ?? null);
  const dataScope = buildDataScope(actor, users);

  return {
    actor,
    sessionUser,
    sessionPermissions,
    dataScope,
    users,
    permissions: actorPermissions
  };
}

export async function requireCurrentActorContext() {
  const context = await getCurrentActorContext();

  if (!context.sessionUser) {
    redirect("/login");
  }

  return context;
}
