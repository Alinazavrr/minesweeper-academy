"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  signInAction,
  signInWithGoogleAction,
  signUpAction,
} from "@/app/auth/actions";
import { initialAuthActionState } from "@/lib/auth/action-state";
import type { AuthMode } from "@/lib/auth/validation";

type AuthFormProps = {
  initialMode: AuthMode;
  message?: string;
  nextPath: string;
};

const pageMessages: Record<string, string> = {
  "signed-out": "You are signed out. Come back any time.",
  "oauth-error": "Google sign-in could not finish. Try again.",
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <p className="text-sm text-red-600 dark:text-red-400">{errors[0]}</p>;
}

export function AuthForm({ initialMode, message, nextPath }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signInState, signInFormAction, signInPending] = useActionState(
    signInAction,
    initialAuthActionState,
  );
  const [signUpState, signUpFormAction, signUpPending] = useActionState(
    signUpAction,
    initialAuthActionState,
  );
  const activeState = mode === "sign-in" ? signInState : signUpState;
  const isPending = mode === "sign-in" ? signInPending : signUpPending;
  const isSignUp = mode === "sign-up";
  const headline = isSignUp ? "Create your account" : "Welcome back";
  const submitLabel = isSignUp ? "Sign up" : "Sign in";

  return (
    <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-6 space-y-2">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          Minesweeper Academy + Arena
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {headline}
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Sign in to save your stats, attempt the Daily Challenge, and accrue
          Mines.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 rounded-md border border-zinc-200 p-1 dark:border-zinc-800">
        <button
          type="button"
          aria-pressed={mode === "sign-in"}
          onClick={() => setMode("sign-in")}
          className={`rounded px-3 py-2 text-sm font-medium transition ${
            mode === "sign-in"
              ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
              : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          aria-pressed={mode === "sign-up"}
          onClick={() => setMode("sign-up")}
          className={`rounded px-3 py-2 text-sm font-medium transition ${
            mode === "sign-up"
              ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
              : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          }`}
        >
          Sign up
        </button>
      </div>

      {message ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200">
          {pageMessages[message] ?? message}
        </p>
      ) : null}

      {activeState.message ? (
        <p
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            activeState.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200"
          }`}
        >
          {activeState.message}
        </p>
      ) : null}

      <form
        action={isSignUp ? signUpFormAction : signInFormAction}
        className="space-y-4"
      >
        <input type="hidden" name="next" value={nextPath} />

        {isSignUp ? (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Display name
            </span>
            <input
              name="displayName"
              autoComplete="nickname"
              placeholder="sweeper_7"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <FieldError errors={activeState.fieldErrors?.displayName} />
          </label>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Email
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <FieldError errors={activeState.fieldErrors?.email} />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Password
          </span>
          <input
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={8}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <FieldError errors={activeState.fieldErrors?.password} />
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isPending ? "Working..." : submitLabel}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        or
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form action={signInWithGoogleAction}>
        <input type="hidden" name="next" value={nextPath} />
        <button
          type="submit"
          className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}
