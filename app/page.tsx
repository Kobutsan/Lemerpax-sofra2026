import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import LoginScreen from "@/components/LoginScreen";

export const metadata: Metadata = {
  title: "Lemer Pax x Sofra 2026",
};

export default async function AccessPage() {
  // Accès déjà validé (cookie 30 jours) : on ne redemande pas le code.
  const cookieStore = await cookies();
  if (await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value)) {
    redirect("/galerie");
  }

  return <LoginScreen />;
}
