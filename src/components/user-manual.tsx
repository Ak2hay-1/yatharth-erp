import Link from "next/link";
import type { ManualBlock, ManualSection } from "@/lib/user-manual";
import { MANUAL_SECTIONS, MANUAL_SUBTITLE, MANUAL_TITLE } from "@/lib/user-manual";
import { cn } from "@/lib/utils";

function Block({ block }: { block: ManualBlock }) {
  switch (block.type) {
    case "p":
      return <p className="text-sm leading-relaxed text-ink">{block.text}</p>;
    case "ul":
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-bg">
                {block.headers.map((h) => (
                  <th key={h} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className={cn("px-3 py-2 align-top text-ink", j === 0 && "font-medium")}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "tip":
      return (
        <div className="rounded-lg border border-sprout/40 bg-sprout/15 px-3 py-2 text-sm text-ink">
          <span className="font-semibold text-ink">Tip: </span>
          {block.text}
        </div>
      );
    case "callout":
      return (
        <div className="rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink">
          <div className="font-semibold">{block.title}</div>
          <p className="mt-1 text-muted">{block.text}</p>
        </div>
      );
    default:
      return null;
  }
}

function Section({ section, dense }: { section: ManualSection; dense?: boolean }) {
  return (
    <section id={section.id} className={cn(dense ? "mb-6" : "mb-8 scroll-mt-8")}>
      <h2 className={cn("font-display tracking-tight text-ink", dense ? "mb-2 text-xl" : "mb-3 text-2xl")}>
        {section.title}
      </h2>
      <div className="space-y-3">
        {section.blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>
    </section>
  );
}

export function UserManualBody({
  dense = false,
  showToc = true,
}: {
  dense?: boolean;
  showToc?: boolean;
}) {
  return (
    <div>
      <header className={dense ? "mb-6" : "mb-8"}>
        <h1 className={cn("font-display tracking-tight text-ink", dense ? "text-2xl" : "text-3xl")}>
          {MANUAL_TITLE}
        </h1>
        <p className="mt-2 text-sm text-muted">{MANUAL_SUBTITLE}</p>
      </header>

      {showToc ? (
        <nav
          aria-label="Manual contents"
          className="mb-8 rounded-xl border border-line bg-card p-4 shadow-[0_1px_0_rgba(35,38,44,0.04)]"
        >
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Contents</div>
          <ol className="columns-1 gap-8 sm:columns-2">
            {MANUAL_SECTIONS.map((s, i) => (
              <li key={s.id} className="mb-1 break-inside-avoid text-sm">
                <a href={`#${s.id}`} className="text-saffron hover:underline">
                  {i + 1}. {s.title.replace(/^\d+\.\s*/, "")}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {MANUAL_SECTIONS.map((section) => (
        <Section key={section.id} section={section} dense={dense} />
      ))}

      <p className="mt-8 text-xs text-muted">YATHARTHA Foods &amp; Beverages · Plant office ERP</p>
    </div>
  );
}

export function UserManualActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/print/help"
        className="inline-flex items-center justify-center rounded-lg bg-saffron px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        Save as PDF
      </Link>
      <a
        href="/docs/USER_MANUAL.md"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-bg"
      >
        Open Markdown
      </a>
    </div>
  );
}
