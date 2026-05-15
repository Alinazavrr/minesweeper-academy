import { z } from "zod";

export type AuthMode = "sign-in" | "sign-up";

export type AuthCredentials = {
  email: string;
  password: string;
  displayName?: string;
};

export type AuthValidationResult =
  | {
      ok: true;
      data: AuthCredentials;
    }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof AuthCredentials, string[]>>;
      message: string;
    };

const baseSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email." }),
  password: z
    .string()
    .min(8, { message: "Use at least 8 characters." }),
});

const signUpSchema = baseSchema.extend({
  displayName: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .pipe(
      z
        .string()
        .min(3, { message: "Use 3-24 letters, numbers, or underscores." })
        .max(24, { message: "Use 3-24 letters, numbers, or underscores." })
        .regex(/^[A-Za-z0-9_]+$/, {
          message:
            "Display names can only use letters, numbers, and underscores.",
        })
        .optional(),
    ),
});

export function validateAuthForm(
  mode: AuthMode,
  formData: FormData,
): AuthValidationResult {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  };
  const parsed = (mode === "sign-up" ? signUpSchema : baseSchema).safeParse(
    raw,
  );

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Check the highlighted fields and try again.",
    };
  }

  return {
    ok: true,
    data: parsed.data,
  };
}

export function normalizeNextPath(nextPath: FormDataEntryValue | null) {
  if (typeof nextPath !== "string") {
    return "/account";
  }

  if (
    !nextPath.startsWith("/") ||
    nextPath.startsWith("//") ||
    nextPath.startsWith("/auth")
  ) {
    return "/account";
  }

  return nextPath;
}
