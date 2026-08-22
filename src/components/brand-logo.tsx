import { BRAND_NAME, BRAND_TAGLINE, LOGO_SRC } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  height = 40,
  priority = false,
}: {
  className?: string;
  height?: number;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC}
      alt={`${BRAND_NAME} ${BRAND_TAGLINE}`}
      height={height}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn(
        "block w-auto bg-transparent object-contain",
        className,
      )}
      style={{ height, width: "auto" }}
    />
  );
}
