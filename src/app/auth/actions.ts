"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthActionState } from "@/lib/auth/action-state";
import {
  normalizeNextPath,
  validateAuthForm,
  type AuthMode,
} from "@/lib/auth/validation";

function errorState(message: string, fieldErrors?: AuthActionState["fieldErrors"]) {
  return {
    status: "error",
    message,
    fieldErrors,
  } satisfies AuthActionState;
}

async function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  if (!host) {
    return "http://localhost:3000";
  }

  return `${protocol}://${host}`;
}

async function authenticateWithPassword(
  mode: AuthMode,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = validateAuthForm(mode, formData);
  if (!parsed.ok) {
    return errorState(parsed.message, parsed.fieldErrors);
  }

  const next = normalizeNextPath(formData.get("next"));
  const supabase = await createClient();

  if (mode === "sign-up") {
    const siteUrl = await getSiteUrl();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: parsed.data.displayName
          ? { display_name: parsed.data.displayName }
          : undefined,
        emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(
          next,
        )}`,
      },
    });

    if (error) {
      return errorState(error.message);
    }

    if (!data.session) {
      return {
        status: "success",
        message: "Check your email to finish creating your account.",
      } satisfies AuthActionState;
    }

    redirect(next);
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return errorState("Invalid email or password.");
  }

  redirect(next);
}

export async function signInAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  return authenticateWithPassword("sign-in", formData);
}

export async function signUpAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  return authenticateWithPassword("sign-up", formData);
}

export async function signInWithGoogleAction(formData: FormData) {
  const next = normalizeNextPath(formData.get("next"));
  const siteUrl = await getSiteUrl();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect("/auth?mode=sign-in&message=oauth-error");
  }

  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth?mode=sign-in&message=signed-out");
}
