import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { getSessionUser } from "@/lib/server/actor";

export default async function LoginPage() {
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <LoginForm />
    </div>
  );
}
