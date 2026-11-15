import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Create account" };

// ?email= comes from the landing page's closing form.
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect(user.onboarded ? "/app" : "/onboarding");
  const { email } = await searchParams;
  return (
    <AuthShell title="Create your account" lead="Free plan. No card needed.">
      <AuthForm mode="signup" defaultEmail={typeof email === "string" ? email.slice(0, 200) : undefined} />
    </AuthShell>
  );
}
