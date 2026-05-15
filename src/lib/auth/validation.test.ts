import { describe, expect, it } from "vitest";

import {
  normalizeNextPath,
  validateAuthForm,
} from "./validation";

function form(entries: Record<string, string>) {
  const data = new FormData();
  Object.entries(entries).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("validateAuthForm", () => {
  it("accepts trimmed sign-up credentials with an optional display name", () => {
    const result = validateAuthForm(
      "sign-up",
      form({
        email: "  learner@example.com ",
        password: "strong-pass-1",
        displayName: "  sweeper_7 ",
      }),
    );

    expect(result).toEqual({
      ok: true,
      data: {
        email: "learner@example.com",
        password: "strong-pass-1",
        displayName: "sweeper_7",
      },
    });
  });

  it("does not require a display name for sign up", () => {
    const result = validateAuthForm(
      "sign-up",
      form({
        email: "learner@example.com",
        password: "strong-pass-1",
        displayName: "   ",
      }),
    );

    expect(result).toEqual({
      ok: true,
      data: {
        email: "learner@example.com",
        password: "strong-pass-1",
        displayName: undefined,
      },
    });
  });

  it("rejects invalid email, short password, and invalid display names", () => {
    const result = validateAuthForm(
      "sign-up",
      form({
        email: "not-an-email",
        password: "short",
        displayName: "a!",
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        email: ["Enter a valid email."],
        password: ["Use at least 8 characters."],
        displayName: [
          "Use 3-24 letters, numbers, or underscores.",
          "Display names can only use letters, numbers, and underscores.",
        ],
      },
    });
  });

  it("ignores display name for sign in", () => {
    const result = validateAuthForm(
      "sign-in",
      form({
        email: " learner@example.com ",
        password: "strong-pass-1",
        displayName: "bad name!",
      }),
    );

    expect(result).toEqual({
      ok: true,
      data: {
        email: "learner@example.com",
        password: "strong-pass-1",
      },
    });
  });
});

describe("normalizeNextPath", () => {
  it("allows local app paths", () => {
    expect(normalizeNextPath("/account")).toBe("/account");
    expect(normalizeNextPath("/play?difficulty=expert")).toBe(
      "/play?difficulty=expert",
    );
  });

  it("rejects external, protocol-relative, and auth-loop redirects", () => {
    expect(normalizeNextPath("https://evil.example")).toBe("/account");
    expect(normalizeNextPath("//evil.example/account")).toBe("/account");
    expect(normalizeNextPath("account")).toBe("/account");
    expect(normalizeNextPath("/auth?next=/account")).toBe("/account");
  });
});
