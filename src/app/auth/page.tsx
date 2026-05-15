import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { normalizeNextPath, type AuthMode } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in - Minesweeper Academy",
};

type AuthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const requestedMode = firstParam(params.mode);
  const initialMode: AuthMode =
    requestedMode === "sign-up" ? "sign-up" : "sign-in";
  const nextPath = normalizeNextPath(firstParam(params.next) ?? "/account");
  const message = firstParam(params.message);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) {
    redirect(nextPath);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <AuthForm
        initialMode={initialMode}
        message={message}
        nextPath={nextPath}
      />
    </main>
  );
}
