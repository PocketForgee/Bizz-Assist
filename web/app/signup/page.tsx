import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect(user.onboarded ? "/app" : "/onboarding");
  return (
    <AuthShell title="Create your account" lead="Free plan. No card needed.">
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
