import { describe, expect, it } from "vitest";
import { deserializeReplay, serializeReplay } from "./replay";
import type { Action } from "./types";

describe("serializeReplay / deserializeReplay", () => {
  it("round-trips an empty action list", () => {
    const bytes = serializeReplay([]);
    expect(bytes.length).toBeGreaterThanOrEqual(3); // magic + version + n=0
    expect(deserializeReplay(bytes)).toEqual([]);
  });

  it("round-trips a single reveal", () => {
    const actions: Action[] = [{ kind: "reveal", row: 4, col: 7, t: 0 }];
    const bytes = serializeReplay(actions);
    const back = deserializeReplay(bytes);
    expect(back).toEqual(actions);
  });

  it("round-trips a mix of all four kinds and preserves dt", () => {
    const actions: Action[] = [
      { kind: "reveal", row: 0, col: 0, t: 0 },
      { kind: "flag", row: 1, col: 2, t: 250 },
      { kind: "question", row: 3, col: 4, t: 1000 },
      { kind: "chord", row: 5, col: 6, t: 1500 },
      { kind: "reveal", row: 15, col: 29, t: 2750 },
    ];
    const bytes = serializeReplay(actions);
    const back = deserializeReplay(bytes);
    expect(back).toEqual(actions);
  });

  it("encodes a max-coord (63,63) cell without overflow", () => {
    const actions: Action[] = [{ kind: "reveal", row: 63, col: 63, t: 0 }];
    expect(deserializeReplay(serializeReplay(actions))).toEqual(actions);
  });

  it("compresses a synthetic Expert game (~150 actions) under 1500 bytes", () => {
    // Mimic the spec target from §16.5: full Expert replay < 1.5 KB. t is
    // normalized to start at 0 (see normalization test below).
    const actions: Action[] = [];
    let t = 0;
    for (let i = 0; i < 150; i++) {
      actions.push({
        kind: i % 5 === 0 ? "flag" : "reveal",
        row: i % 16,
        col: (i * 7) % 30,
        t,
      });
      // varied dts that exercise the varint path: 50ms..2000ms
      t += 50 + ((i * 37) % 1950);
    }
    const bytes = serializeReplay(actions);
    expect(bytes.length).toBeLessThan(1500);
    expect(deserializeReplay(bytes)).toEqual(actions);
  });

  it("normalizes wall-clock t so action[0].t becomes 0 on round-trip", () => {
    // Real games carry t = Date.now() (trillions). Encoder strips the offset
    // and only stores deltas — keeps blobs small. Documented contract.
    const t0 = 1_700_000_000_000;
    const actions: Action[] = [
      { kind: "reveal", row: 0, col: 0, t: t0 },
      { kind: "flag", row: 1, col: 1, t: t0 + 250 },
      { kind: "reveal", row: 2, col: 2, t: t0 + 1000 },
    ];
    const back = deserializeReplay(serializeReplay(actions));
    expect(back).toEqual([
      { kind: "reveal", row: 0, col: 0, t: 0 },
      { kind: "flag", row: 1, col: 1, t: 250 },
      { kind: "reveal", row: 2, col: 2, t: 1000 },
    ]);
  });

  it("rejects a buffer with the wrong magic byte", () => {
    const bytes = serializeReplay([
      { kind: "reveal", row: 0, col: 0, t: 0 },
    ]);
    bytes[0] = 0x00;
    expect(() => deserializeReplay(bytes)).toThrowError(/magic/i);
  });

  it("rejects an unsupported version", () => {
    const bytes = serializeReplay([
      { kind: "reveal", row: 0, col: 0, t: 0 },
    ]);
    bytes[1] = 99;
    expect(() => deserializeReplay(bytes)).toThrowError(/version/i);
  });

  it("rejects a truncated buffer", () => {
    const bytes = serializeReplay([
      { kind: "reveal", row: 0, col: 0, t: 0 },
      { kind: "flag", row: 1, col: 1, t: 100 },
    ]);
    const truncated = bytes.slice(0, bytes.length - 2);
    expect(() => deserializeReplay(truncated)).toThrowError(/truncated/i);
  });

  it("rejects out-of-range row on encode", () => {
    expect(() =>
      serializeReplay([{ kind: "reveal", row: 64, col: 0, t: 0 }]),
    ).toThrowError(/row/i);
  });

  it("rejects out-of-range col on encode", () => {
    expect(() =>
      serializeReplay([{ kind: "reveal", row: 0, col: 64, t: 0 }]),
    ).toThrowError(/col/i);
  });

  it("rejects a negative-dt action sequence on encode", () => {
    expect(() =>
      serializeReplay([
        { kind: "reveal", row: 0, col: 0, t: 1000 },
        { kind: "flag", row: 1, col: 1, t: 500 },
      ]),
    ).toThrowError(/dt/i);
  });

  it("preserves dts that exceed one varint byte (>= 128ms)", () => {
    const actions: Action[] = [
      { kind: "reveal", row: 0, col: 0, t: 0 },
      { kind: "reveal", row: 0, col: 1, t: 200 },
      { kind: "reveal", row: 0, col: 2, t: 200 + 16383 }, // 2-byte varint
      { kind: "reveal", row: 0, col: 3, t: 200 + 16383 + 2097151 }, // 3-byte
    ];
    expect(deserializeReplay(serializeReplay(actions))).toEqual(actions);
  });
});
