"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Monitor, ShieldCheck } from "lucide-react";
import { activateLicenseAction } from "@/server/license-actions";
import { BrandLogo } from "@/components/brand-logo";
import { Button, Field, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

function formatProductKey(raw: string) {
  const alnum = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  const chunks = alnum.match(/.{1,4}/g) ?? [];
  return chunks.join("-");
}

const STEPS = [
  { id: 0, label: "Welcome" },
  { id: 1, label: "Product key" },
  { id: 2, label: "Sign in" },
] as const;

export function ActivateForm({
  machineId,
  version,
}: {
  machineId: string | null;
  version: string;
}) {
  const [step, setStep] = useState(0);
  const [key, setKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState(activateLicenseAction, undefined);

  useEffect(() => {
    if (state?.error) setStep(1);
  }, [state]);

  async function copyMachineId() {
    if (!machineId) return;
    try {
      await navigator.clipboard.writeText(machineId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-forest">
      <aside className="hidden w-[340px] shrink-0 flex-col justify-between p-10 text-white lg:flex">
        <div>
          <BrandLogo height={48} priority />
          <p className="mt-5 text-sm font-semibold text-white/70">Plant office software</p>
          <ol className="mt-12 space-y-3">
            {STEPS.map((item) => {
              const done = step > item.id;
              const current = step === item.id;
              return (
                <li key={item.id} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                      done && "bg-sprout text-forest",
                      current && "bg-sprout text-forest",
                      !done && !current && "bg-white/10 text-white/60",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : item.id + 1}
                  </span>
                  <span className={cn("text-sm font-semibold", current || done ? "text-white" : "text-white/50")}>
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="text-xs text-white/45">Version {version} · This PC only</p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-bg p-6 sm:p-10">
        <div className="w-full max-w-lg rounded-2xl border border-line bg-card p-8 shadow-[0_20px_50px_rgba(35,38,44,0.08)] sm:p-10">
          {step === 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron">Installation</p>
              <h1 className="font-display mt-2 text-3xl tracking-tight text-ink">Install on this office PC</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Unlock YATHARTHA Foods ERP with the product key given to you. After that, staff sign in as usual.
              </p>
              <ul className="mt-8 space-y-4">
                <li className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sprout">
                    <ShieldCheck className="h-5 w-5 text-forest" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">Licensed to Yatharth</span>
                    <span className="text-sm text-muted">Works only with the official product key.</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sprout">
                    <Monitor className="h-5 w-5 text-forest" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">Tied to this computer</span>
                    <span className="text-sm text-muted">Copying the app to another PC will ask for the key again.</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sprout">
                    <KeyRound className="h-5 w-5 text-forest" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">Then sign in</span>
                    <span className="text-sm text-muted">Use the Super Admin or staff login created for you.</span>
                  </span>
                </li>
              </ul>
              <Button type="button" className="mt-8 w-full" onClick={() => setStep(1)}>
                Continue
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-saffron">Step 2 of 2</p>
              <h1 className="font-display mt-2 text-3xl tracking-tight text-ink">Enter product key</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Paste the key exactly as shared with you. Dashes are added automatically.
              </p>
              <form action={action} className="mt-8 space-y-5">
                <Field label="Product key">
                  <Input
                    name="key"
                    type="text"
                    required
                    value={key}
                    onChange={(e) => setKey(formatProductKey(e.target.value))}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="YATH-XXXX-XXXX-XXXX-XXXX"
                    className="font-mono text-base uppercase tracking-wider"
                  />
                </Field>
                <div className="rounded-xl border border-line bg-bg px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">This PC</p>
                  {machineId ? (
                    <div className="mt-1.5 flex items-start justify-between gap-3">
                      <p className="break-all font-mono text-xs text-ink">{machineId}</p>
                      <button
                        type="button"
                        onClick={copyMachineId}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-saffron hover:opacity-90"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs text-bad">Could not identify this PC. Restart the app and try again.</p>
                  )}
                </div>
                {state?.error ? <p className="text-sm text-bad">{state.error}</p> : null}
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(0)} disabled={pending}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={pending || !machineId || key.length < 19}>
                    {pending ? "Activating…" : "Activate this PC"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
