import "server-only";

import { deserializeReplay, type Action } from "@minesweeper/engine";

/**
 * Convert a client-supplied base64 replay blob into the textual bytea format
 * Postgres accepts on insert (`\x<hex>`).
 *
 * supabase-js serializes payloads as JSON, so the column receives a string —
 * Postgres parses `\x...` as bytea natively. Returning null preserves "no
 * replay captured" for legacy paths or empty action lists.
 */
export function base64ToPostgresBytea(b64: string | null): string | null {
  if (b64 === null) return null;
  const buf = Buffer.from(b64, "base64");
  if (buf.length === 0) return null;
  return "\\x" + buf.toString("hex");
}

/**
 * PostgREST returns bytea columns as base64 strings by default. Decode and
 * deserialize in one step so callers don't have to know the wire format.
 */
export function decodeReplayBlob(
  blob: string | Uint8Array | null,
): Action[] | null {
  if (blob === null) return null;
  let bytes: Uint8Array;
  if (typeof blob === "string") {
    if (blob.startsWith("\\x")) {
      // Defensive: handles the raw-hex form if it ever leaks through.
      bytes = Uint8Array.from(Buffer.from(blob.slice(2), "hex"));
    } else {
      bytes = Uint8Array.from(Buffer.from(blob, "base64"));
    }
  } else {
    bytes = blob;
  }
  if (bytes.length === 0) return null;
  return deserializeReplay(bytes);
}
