import type { Action } from "./types";

/**
 * Compact binary replay encoding — see PROJECT_PLAN.md §16.5
 * (target < 8 bytes/action, full Expert replay < 1.5 KB).
 *
 * Layout:
 *   byte 0      magic 0x4d ('M')
 *   byte 1      format version (currently 1)
 *   bytes 2..   n_actions: LEB128 unsigned varint
 *   per action:
 *     byte 0    kind (0=reveal, 1=flag, 2=question, 3=chord)
 *     byte 1    row (0..63)
 *     byte 2    col (0..63)
 *     bytes 3.. dt_ms since previous action: LEB128 unsigned varint
 *               (action 0 always carries dt = 0)
 *
 * Decoded actions carry a relative `t` (cumulative dts starting at 0),
 * which is what `annotateMoves` needs — `time_ms` lives on the games
 * row separately when wall-clock totals matter.
 */

const MAGIC = 0x4d;
const VERSION = 1;
const MAX_COORD = 63;

const KIND_TO_CODE: Record<Action["kind"], number> = {
  reveal: 0,
  flag: 1,
  question: 2,
  chord: 3,
};

const CODE_TO_KIND: ReadonlyArray<Action["kind"]> = [
  "reveal",
  "flag",
  "question",
  "chord",
];

export function serializeReplay(actions: ReadonlyArray<Action>): Uint8Array {
  const out: number[] = [MAGIC, VERSION];
  writeVarint(out, actions.length);

  let prevT = 0;
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]!;
    if (a.row < 0 || a.row > MAX_COORD || !Number.isInteger(a.row)) {
      throw new Error(`replay: row ${a.row} out of range [0, ${MAX_COORD}]`);
    }
    if (a.col < 0 || a.col > MAX_COORD || !Number.isInteger(a.col)) {
      throw new Error(`replay: col ${a.col} out of range [0, ${MAX_COORD}]`);
    }
    const dt = i === 0 ? 0 : a.t - prevT;
    if (dt < 0 || !Number.isInteger(dt)) {
      throw new Error(
        `replay: dt ${dt} (action ${i}) must be a non-negative integer`,
      );
    }
    out.push(KIND_TO_CODE[a.kind], a.row, a.col);
    writeVarint(out, dt);
    prevT = a.t;
  }
  return Uint8Array.from(out);
}

export function deserializeReplay(bytes: Uint8Array): Action[] {
  if (bytes.length < 3) {
    throw new Error("replay: truncated buffer (header)");
  }
  if (bytes[0] !== MAGIC) {
    throw new Error(
      `replay: bad magic 0x${bytes[0]!.toString(16).padStart(2, "0")}`,
    );
  }
  if (bytes[1] !== VERSION) {
    throw new Error(`replay: unsupported version ${bytes[1]}`);
  }
  let off = 2;
  const n = readVarint(bytes, off);
  off = n.next;

  const actions: Action[] = new Array(n.value);
  let t = 0;
  for (let i = 0; i < n.value; i++) {
    if (off + 3 > bytes.length) {
      throw new Error(`replay: truncated action header at index ${i}`);
    }
    const code = bytes[off]!;
    const row = bytes[off + 1]!;
    const col = bytes[off + 2]!;
    off += 3;
    const dtRead = readVarint(bytes, off);
    off = dtRead.next;
    t = i === 0 ? 0 : t + dtRead.value;
    const kind = CODE_TO_KIND[code];
    if (kind === undefined) {
      throw new Error(`replay: unknown action kind code ${code}`);
    }
    actions[i] = { kind, row, col, t };
  }
  if (off !== bytes.length) {
    throw new Error(
      `replay: trailing ${bytes.length - off} byte(s) after last action`,
    );
  }
  return actions;
}

function writeVarint(out: number[], value: number): void {
  let v = value;
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v = Math.floor(v / 128);
  }
  out.push(v & 0x7f);
}

function readVarint(
  bytes: Uint8Array,
  start: number,
): { value: number; next: number } {
  let value = 0;
  let shift = 1;
  let off = start;
  while (true) {
    if (off >= bytes.length) {
      throw new Error("replay: truncated varint");
    }
    const b = bytes[off]!;
    off++;
    value += (b & 0x7f) * shift;
    if ((b & 0x80) === 0) return { value, next: off };
    shift *= 128;
    if (shift > 2 ** 53) {
      throw new Error("replay: varint exceeds safe integer range");
    }
  }
}
