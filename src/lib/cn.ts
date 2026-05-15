/**
 * Minimal `clsx`-shaped class-name joiner. We don't pull in a dep for this
 * because the surface we need is tiny — strings + falsy values.
 */
export function cn(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}
