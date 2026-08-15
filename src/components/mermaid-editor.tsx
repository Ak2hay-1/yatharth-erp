"use client";

import { useEffect, useId, useState } from "react";

export function MermaidPreview({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const trimmed = chart.trim();
    if (!trimmed) {
      setSvg("");
      setError(null);
      return;
    }
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "strict",
        });
        const { svg: rendered } = await mermaid.render(`mmd-${id}-${Date.now()}`, trimmed);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setSvg("");
          setError(e instanceof Error ? e.message : "Could not render flowchart");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (!chart.trim()) {
    return <p className="text-sm text-muted">Add Mermaid syntax to preview a flowchart.</p>;
  }
  if (error) {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">{error}</p>;
  }
  if (!svg) {
    return <p className="text-sm text-muted">Rendering…</p>;
  }
  return (
    <div
      className="overflow-x-auto rounded-lg border border-line bg-white p-3"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function MermaidEditorField({
  name,
  defaultValue,
  label = "Flowchart (Mermaid)",
}: {
  name: string;
  defaultValue?: string;
  label?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <div className="space-y-2">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={8}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 font-mono text-xs text-ink outline-none transition focus:border-saffron focus:ring-2 focus:ring-saffron/20"
        placeholder={"flowchart TD\n  A[Receive RM] --> B[Prep]\n  B --> C[Cook]\n  C --> D[Freeze]"}
      />
      <MermaidPreview chart={value} />
    </div>
  );
}
