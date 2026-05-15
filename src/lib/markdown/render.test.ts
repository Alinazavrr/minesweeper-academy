import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./render";

describe("renderMarkdown", () => {
  it("returns an empty array for empty input", () => {
    expect(renderMarkdown("")).toEqual([]);
  });

  it("parses a paragraph with bold and italic", () => {
    expect(renderMarkdown("Look at **this** *now*.")).toEqual([
      {
        kind: "paragraph",
        children: [
          { kind: "text", value: "Look at " },
          { kind: "bold", children: [{ kind: "text", value: "this" }] },
          { kind: "text", value: " " },
          { kind: "italic", children: [{ kind: "text", value: "now" }] },
          { kind: "text", value: "." },
        ],
      },
    ]);
  });

  it("parses inline code", () => {
    const blocks = renderMarkdown("Use `cell.adjacent` to check.");
    expect(blocks[0]).toEqual({
      kind: "paragraph",
      children: [
        { kind: "text", value: "Use " },
        { kind: "code", value: "cell.adjacent" },
        { kind: "text", value: " to check." },
      ],
    });
  });

  it("parses a fenced code block", () => {
    const blocks = renderMarkdown("```js\nconst x = 1;\n```");
    expect(blocks).toEqual([
      { kind: "code-block", lang: "js", value: "const x = 1;" },
    ]);
  });

  it("parses a heading and a list", () => {
    const blocks = renderMarkdown("## Plan\n- One\n- Two");
    expect(blocks).toEqual([
      {
        kind: "heading",
        level: 2,
        children: [{ kind: "text", value: "Plan" }],
      },
      {
        kind: "ul",
        items: [
          [{ kind: "text", value: "One" }],
          [{ kind: "text", value: "Two" }],
        ],
      },
    ]);
  });

  it("parses an ordered list", () => {
    const blocks = renderMarkdown("1. First\n2. Second");
    expect(blocks).toEqual([
      {
        kind: "ol",
        items: [
          [{ kind: "text", value: "First" }],
          [{ kind: "text", value: "Second" }],
        ],
      },
    ]);
  });

  it("parses a safe http link", () => {
    const blocks = renderMarkdown("See [docs](https://example.com).");
    expect(blocks[0]).toEqual({
      kind: "paragraph",
      children: [
        { kind: "text", value: "See " },
        {
          kind: "link",
          href: "https://example.com",
          children: [{ kind: "text", value: "docs" }],
        },
        { kind: "text", value: "." },
      ],
    });
  });

  it("rejects javascript: links and treats them as plain text", () => {
    const blocks = renderMarkdown("[bad](javascript:alert(1))");
    expect(blocks[0]).toEqual({
      kind: "paragraph",
      children: [{ kind: "text", value: "[bad](javascript:alert(1))" }],
    });
  });

  it("leaves unmatched single asterisks alone", () => {
    const blocks = renderMarkdown("a *partial expression here");
    expect(blocks[0]).toEqual({
      kind: "paragraph",
      children: [{ kind: "text", value: "a *partial expression here" }],
    });
  });

  it("collapses multi-line paragraphs into one paragraph", () => {
    const blocks = renderMarkdown("First line.\nSecond line.\n\nThird.");
    expect(blocks.length).toBe(2);
    expect(blocks[0]?.kind).toBe("paragraph");
    expect(blocks[1]?.kind).toBe("paragraph");
  });
});
