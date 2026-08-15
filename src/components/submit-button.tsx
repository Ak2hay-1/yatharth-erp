"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

export function SubmitButton({
  children,
  variant = "primary",
  pendingLabel = "Saving…",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
