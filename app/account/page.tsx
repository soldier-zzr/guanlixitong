import { AccountPasswordForm } from "@/components/forms/account-password-form";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/section-card";
import { requireCurrentActorContext } from "@/lib/server/actor";
import { userTitleLabelMap } from "@/lib/server/config";

export default async function AccountPage() {
  const { sessionUser } = await requireCurrentActorContext();

  if (!sessionUser) {
    return null;
  }

  return (
    <div className="space-y-6 py-4">
      <PageHeader
        eyebrow="Account"
        title="账号设置"
        description="查看当前登录账号信息，并修改自己的登录密码。管理员如需维护其他同事，请前往账号管理。"
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <SectionCard title="当前账号信息" subtitle="手机号用于登录，岗位由管理员统一维护。">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="field-label">姓名</p>
              <div className="field flex items-center bg-slate-50 text-slate-700">{sessionUser.name}</div>
            </div>
            <div>
              <p className="field-label">岗位</p>
              <div className="field flex items-center bg-slate-50 text-slate-700">
                {sessionUser.title ? userTitleLabelMap[sessionUser.title] : "未设置"}
              </div>
            </div>
            <div>
              <p className="field-label">手机号</p>
              <div className="field flex items-center bg-slate-50 text-slate-700">
                {sessionUser.phone || "未设置"}
              </div>
            </div>
            <div>
              <p className="field-label">邮箱</p>
              <div className="field flex items-center bg-slate-50 text-slate-700">
                {sessionUser.email || "未设置"}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="修改登录密码" subtitle="修改后下次登录立即生效，建议使用仅自己知道的密码。">
          <AccountPasswordForm />
        </SectionCard>
      </div>
    </div>
  );
}
