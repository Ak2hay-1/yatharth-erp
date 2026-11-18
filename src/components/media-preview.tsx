"use client";

import { useState } from "react";

export function MediaPreview({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div className="mb-2 flex h-40 items-center justify-center rounded-md border border-dashed border-line bg-bg px-3 text-center text-xs text-muted">
        Preview unavailable
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="mb-2 h-40 w-full rounded-md object-cover bg-bg"
      onError={() => setBroken(true)}
    />
  );
}
