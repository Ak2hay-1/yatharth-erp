import Image from "next/image";
import Link from "next/link";
import { ProductCardActions } from "@/components/product-card-actions";
import { assetUrl, money, type PublicProduct } from "@/lib/api";

type ProductCardProps = {
  product: PublicProduct;
  showPrice?: boolean;
};

export function ProductCard({ product, showPrice = false }: ProductCardProps) {
  const img = product.assets?.[0]?.publicUrl;
  const enquireHref = `/contact?product=${encodeURIComponent(product.name)}`;
  const isVeg = product.category === "veg" || product.category === "potato-veg";
  const packLabel = product.packSize || `${product.unitsPerPkt} pcs / packet`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={enquireHref} className="relative aspect-square bg-neutral-100">
        {img ? (
          <Image
            src={assetUrl(img)}
            alt={product.name}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(max-width:768px) 50vw, 25vw"
          />
        ) : (
          <div
            className={`flex h-full flex-col items-center justify-center gap-3 px-4 text-center ${
              isVeg
                ? "bg-[radial-gradient(circle_at_30%_20%,#d8f5b8,transparent_55%),linear-gradient(160deg,#f3faf0,#e8f0e4)]"
                : "bg-[radial-gradient(circle_at_30%_20%,#ffd4b8,transparent_55%),linear-gradient(160deg,#fff6f0,#f3e8e0)]"
            }`}
          >
            <span
              className={`inline-flex h-14 w-14 items-center justify-center rounded-full text-xs font-bold uppercase tracking-wide ${
                isVeg ? "bg-[#2f6b2f] text-white" : "bg-[#b33a1a] text-white"
              }`}
            >
              {isVeg ? "Veg" : "Non-veg"}
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-800">{product.name}</p>
              <p className="mt-1 text-xs text-neutral-500">Pack photo coming soon — enquire for samples</p>
            </div>
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FE7733]">
          {product.category.replace("-", " ")}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-900">{product.name}</h3>
        <p className="mt-1 text-xs text-neutral-500">{packLabel}</p>
        {showPrice && product.rateB2b > 0 ? (
          <p className="mt-2 text-base font-bold text-neutral-900">{money(product.rateB2b)}</p>
        ) : null}
        <ProductCardActions
          sku={product.sku}
          name={product.name}
          packSize={packLabel}
          rateB2b={product.rateB2b}
          category={product.category}
          imageUrl={img ? assetUrl(img) : undefined}
          enquireHref={enquireHref}
        />
      </div>
    </article>
  );
}
