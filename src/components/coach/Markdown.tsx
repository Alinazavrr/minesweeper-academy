"use client";

import { Fragment } from "react";
import { renderMarkdown, type Block, type Inline } from "@/lib/markdown/render";

type Props = {
  text: string;
};

/**
 * React renderer for the parse tree from `renderMarkdown`. Keeps all text in
 * React's children path — no `dangerouslySetInnerHTML`, no third-party
 * sanitizer needed.
 */
export function Markdown({ text }: Props) {
  const blocks = renderMarkdown(text);
  if (blocks.length === 0) return null;
  return (
    <div className="space-y-2 text-sm leading-6">
      {blocks.map((b, i) => (
        <BlockNode key={i} block={b} />
      ))}
    </div>
  );
}

function BlockNode({ block }: { block: Block }) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p>
          {block.children.map((c, i) => (
            <InlineNode key={i} node={c} />
          ))}
        </p>
      );
    case "heading": {
      const cls =
        block.level === 1
          ? "text-base font-semibold"
          : block.level === 2
            ? "text-sm font-semibold"
            : "text-sm font-semibold opacity-80";
      const inner = block.children.map((c, i) => (
        <InlineNode key={i} node={c} />
      ));
      if (block.level === 1) return <h2 className={cls}>{inner}</h2>;
      if (block.level === 2) return <h3 className={cls}>{inner}</h3>;
      return <h4 className={cls}>{inner}</h4>;
    }
    case "code-block":
      return (
        <pre className="overflow-x-auto rounded-md bg-zinc-900 p-3 text-xs leading-5 text-zinc-100 dark:bg-zinc-800">
          <code>{block.value}</code>
        </pre>
      );
    case "ul":
      return (
        <ul className="list-disc space-y-1 pl-5">
          {block.items.map((children, i) => (
            <li key={i}>
              {children.map((c, j) => (
                <InlineNode key={j} node={c} />
              ))}
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal space-y-1 pl-5">
          {block.items.map((children, i) => (
            <li key={i}>
              {children.map((c, j) => (
                <InlineNode key={j} node={c} />
              ))}
            </li>
          ))}
        </ol>
      );
  }
}

function InlineNode({ node }: { node: Inline }) {
  switch (node.kind) {
    case "text":
      return <Fragment>{node.value}</Fragment>;
    case "bold":
      return (
        <strong>
          {node.children.map((c, i) => (
            <InlineNode key={i} node={c} />
          ))}
        </strong>
      );
    case "italic":
      return (
        <em>
          {node.children.map((c, i) => (
            <InlineNode key={i} node={c} />
          ))}
        </em>
      );
    case "code":
      return (
        <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-[0.85em] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
          {node.value}
        </code>
      );
    case "link":
      return (
        <a
          href={node.href}
          rel="noopener noreferrer"
          target={node.href.startsWith("/") ? undefined : "_blank"}
          className="text-emerald-700 underline decoration-dotted hover:decoration-solid dark:text-emerald-400"
        >
          {node.children.map((c, i) => (
            <InlineNode key={i} node={c} />
          ))}
        </a>
      );
  }
}
