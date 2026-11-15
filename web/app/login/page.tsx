import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.onboarded ? (user.role === "owner" ? "/app" : "/agent") : "/onboarding");
  return (
    <AuthShell title="Sign in" lead="Owners and agents use the same sign-in.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
