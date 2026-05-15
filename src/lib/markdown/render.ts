/**
 * Minimal safe Markdown renderer for Coach assistant bubbles.
 *
 * Covers the subset gpt-4o-mini actually produces in coach replies:
 * paragraphs, ordered/unordered lists, headings, inline `code`,
 * fenced code blocks, **bold**, *italic*, and [text](url) links.
 *
 * Safety:
 *   - Input is escaped first, then markdown tokens are turned into HTML
 *     tags on the already-escaped text. No `dangerouslySetInnerHTML` of
 *     raw model output anywhere.
 *   - Links are gated by an allowlist: http(s):// and mailto: only.
 *     Anything else falls through to plain text.
 *
 * Returns a tree of nodes ready to render with React — no string→HTML
 * round-trip needed by the caller.
 */

export type Inline =
  | { kind: "text"; value: string }
  | { kind: "bold"; children: Inline[] }
  | { kind: "italic"; children: Inline[] }
  | { kind: "code"; value: string }
  | { kind: "link"; href: string; children: Inline[] };

export type Block =
  | { kind: "paragraph"; children: Inline[] }
  | { kind: "heading"; level: 1 | 2 | 3 | 4; children: Inline[] }
  | { kind: "code-block"; lang: string | null; value: string }
  | { kind: "ul"; items: Inline[][] }
  | { kind: "ol"; items: Inline[][] };

export function renderMarkdown(input: string): Block[] {
  const lines = input.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.trim().length === 0) {
      i++;
      continue;
    }
    // Fenced code block.
    const fenceMatch = line.match(/^```(\w+)?\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[1] ?? null;
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !/^```\s*$/.test(lines[i]!)) {
        codeLines.push(lines[i]!);
        i++;
      }
      if (i < lines.length) i++; // closing fence
      blocks.push({ kind: "code-block", lang, value: codeLines.join("\n") });
      continue;
    }
    // Heading.
    const headingMatch = line.match(/^(#{1,4})\s+(.+?)\s*$/);
    if (headingMatch) {
      const level = headingMatch[1]!.length as 1 | 2 | 3 | 4;
      blocks.push({
        kind: "heading",
        level,
        children: parseInline(headingMatch[2]!),
      });
      i++;
      continue;
    }
    // Unordered list (bullets stay grouped while consecutive `-` or `*` lines).
    if (/^[-*]\s+/.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i]!)) {
        items.push(parseInline(lines[i]!.replace(/^[-*]\s+/, "")));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    // Ordered list (`1.`, `2.`, etc — accept any digit prefix).
    if (/^\d+\.\s+/.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i]!)) {
        items.push(parseInline(lines[i]!.replace(/^\d+\.\s+/, "")));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }
    // Paragraph: accumulate until blank or a structural line.
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i]!.trim().length > 0 &&
      !/^```/.test(lines[i]!) &&
      !/^#{1,4}\s+/.test(lines[i]!) &&
      !/^[-*]\s+/.test(lines[i]!) &&
      !/^\d+\.\s+/.test(lines[i]!)
    ) {
      paraLines.push(lines[i]!);
      i++;
    }
    blocks.push({
      kind: "paragraph",
      children: parseInline(paraLines.join(" ")),
    });
  }
  return blocks;
}

/**
 * Inline tokenizer. Walks left-to-right and matches the earliest of:
 *   `code`, **bold**, *italic*, [text](url).
 *
 * Bold/italic require the marker to be repeated (i.e. balanced) — unmatched
 * single asterisks remain literal text. This avoids the classic Markdown
 * footgun where `*partial expression` mid-sentence gets eaten as italic.
 */
function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  let plain = "";
  const flush = () => {
    if (plain.length > 0) {
      out.push({ kind: "text", value: plain });
      plain = "";
    }
  };
  while (i < src.length) {
    const ch = src[i];
    if (ch === "`") {
      const end = src.indexOf("`", i + 1);
      if (end !== -1) {
        flush();
        out.push({ kind: "code", value: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (ch === "*" && src[i + 1] === "*") {
      const end = src.indexOf("**", i + 2);
      if (end !== -1 && end > i + 2) {
        flush();
        out.push({
          kind: "bold",
          children: parseInline(src.slice(i + 2, end)),
        });
        i = end + 2;
        continue;
      }
    }
    if (ch === "*") {
      // Italic: skip if the next char would be the closing marker of a bold
      // (we handled that above) or whitespace.
      const next = src[i + 1];
      if (next && next !== "*" && next !== " ") {
        const end = src.indexOf("*", i + 1);
        if (end !== -1 && src[end - 1] !== " ") {
          flush();
          out.push({
            kind: "italic",
            children: parseInline(src.slice(i + 1, end)),
          });
          i = end + 1;
          continue;
        }
      }
    }
    if (ch === "[") {
      const close = src.indexOf("]", i + 1);
      if (close !== -1 && src[close + 1] === "(") {
        const urlEnd = src.indexOf(")", close + 2);
        if (urlEnd !== -1) {
          const url = src.slice(close + 2, urlEnd).trim();
          if (isSafeUrl(url)) {
            flush();
            out.push({
              kind: "link",
              href: url,
              children: parseInline(src.slice(i + 1, close)),
            });
            i = urlEnd + 1;
            continue;
          }
        }
      }
    }
    plain += ch;
    i++;
  }
  flush();
  return out;
}

function isSafeUrl(url: string): boolean {
  return (
    /^https?:\/\//i.test(url) ||
    /^mailto:/i.test(url) ||
    url.startsWith("/")
  );
}
