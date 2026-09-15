import { Fragment, type ReactNode } from "react";

// Small, dependency-free renderer for the markdown subset used in exam packs:
// fenced code blocks, inline code, bold/italic, links, lists and line breaks.
// Raw HTML is never emitted, so question text can't inject markup.

type Block =
  | { kind: "code"; lang: string; body: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "para"; text: string };

const FENCE = /^\s*```\s*([\w+-]*)\s*$/;
const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];

  function flushPara() {
    if (para.length) blocks.push({ kind: "para", text: para.join("\n") });
    para = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = FENCE.exec(line);
    if (fence) {
      flushPara();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i++]);
      blocks.push({ kind: "code", lang: fence[1], body: body.join("\n") });
      continue;
    }
    const bullet = BULLET.exec(line) ?? NUMBERED.exec(line);
    if (bullet) {
      flushPara();
      const ordered = NUMBERED.test(line);
      const items: string[] = [];
      while (i < lines.length) {
        const m = ordered ? NUMBERED.exec(lines[i]) : BULLET.exec(lines[i]);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      i--;
      blocks.push({ kind: "list", ordered, items });
      continue;
    }
    if (line.trim() === "") {
      flushPara();
      continue;
    }
    para.push(line);
  }
  flushPara();
  return blocks;
}

const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/g;

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const lines = text.split("\n");
  lines.forEach((line, li) => {
    let last = 0;
    let key = 0;
    for (const m of line.matchAll(INLINE)) {
      const tok = m[0];
      const at = m.index ?? 0;
      if (at > last) out.push(line.slice(last, at));
      const k = `${li}-${key++}`;
      if (tok.startsWith("`")) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
      else if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
      else if (tok.startsWith("[")) {
        const close = tok.indexOf("](");
        out.push(
          <a key={k} href={tok.slice(close + 2, -1)} target="_blank" rel="noreferrer">
            {tok.slice(1, close)}
          </a>,
        );
      } else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
      last = at + tok.length;
    }
    if (last < line.length) out.push(line.slice(last));
    if (li < lines.length - 1) out.push(<br key={`br-${li}`} />);
  });
  return out;
}

interface Props {
  source: string;
  /** Rendered at the start of the first paragraph (e.g. a "Correct." label). */
  lead?: ReactNode;
  className?: string;
}

export default function Markdown({ source, lead, className }: Props) {
  const blocks = parseBlocks(source);
  const cls = className ? `md ${className}` : "md";
  if (blocks.length === 0) return lead ? <div className={cls}>{lead}</div> : null;

  return (
    <div className={cls}>
      {blocks.map((block, i) => {
        const leadNode = i === 0 && lead ? <Fragment>{lead} </Fragment> : null;
        if (block.kind === "code") {
          return (
            <Fragment key={i}>
              {leadNode ? <p>{leadNode}</p> : null}
              <pre data-lang={block.lang || undefined}>
                <code>{block.body}</code>
              </pre>
            </Fragment>
          );
        }
        if (block.kind === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Fragment key={i}>
              {leadNode ? <p>{leadNode}</p> : null}
              <Tag>
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </Tag>
            </Fragment>
          );
        }
        return (
          <p key={i}>
            {leadNode}
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
