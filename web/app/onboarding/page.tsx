import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { OnboardingFlow } from "./flow";

export const metadata: Metadata = { title: "Set up" };

export default async function OnboardingPage() {
  const user = await requirePageUser({ allowUnonboarded: true });
  if (user.onboarded) redirect(user.role === "owner" ? "/app" : "/app/inbox");
  if (user.role !== "owner") redirect("/app/inbox");
  return <OnboardingFlow businessName={user.business_name} />;
}
