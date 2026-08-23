import Image from "next/image";
import Link from "next/link";
import { assetUrl, money, type PublicProduct } from "@/lib/api";

type ProductCardProps = {
  product: PublicProduct;
  showPrice?: boolean;
};

export function ProductCard({ product, showPrice = false }: ProductCardProps) {
  const img = product.assets?.[0]?.publicUrl;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href="/contact" className="relative aspect-square bg-neutral-100">
        {img ? (
          <Image
            src={assetUrl(img)}
            alt={product.name}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(max-width:768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-400">
            <span className="text-4xl">{product.category === "veg" ? "🥬" : "🍗"}</span>
            <span className="text-xs uppercase tracking-wide">Photo coming soon</span>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FE7733]">
          {product.category.replace("-", " ")}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-900">{product.name}</h3>
        <p className="mt-1 text-xs text-neutral-500">
          {product.packSize || `${product.unitsPerPkt} pcs / packet`}
        </p>
        {showPrice && product.rateB2b > 0 ? (
          <p className="mt-2 text-base font-bold text-neutral-900">{money(product.rateB2b)}</p>
        ) : null}
        <Link
          href={`/contact?product=${encodeURIComponent(product.name)}`}
          className="mt-auto pt-3 text-center text-xs font-semibold uppercase tracking-wide text-[#FE7733] transition hover:text-[#23262C]"
        >
          Enquire →
        </Link>
      </div>
    </article>
  );
}
