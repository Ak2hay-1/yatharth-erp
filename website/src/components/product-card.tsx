import Image from "next/image";
import Link from "next/link";
import { ProductCardActions } from "@/components/product-card-actions";
import { money, type PublicProduct } from "@/lib/api";
import { isVegProduct, packLabel, productImageSrc } from "@/lib/product-media";

type ProductCardProps = {
  product: PublicProduct;
  showPrice?: boolean;
};

export function ProductCard({ product, showPrice = false }: ProductCardProps) {
  const img = productImageSrc(product);
  const detailHref = `/products/${encodeURIComponent(product.sku)}`;
  const enquireHref = `/contact?product=${encodeURIComponent(product.name)}`;
  const veg = isVegProduct(product.category);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={detailHref} className="relative aspect-square bg-neutral-100">
        <Image
          src={img}
          alt={product.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width:768px) 50vw, 25vw"
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
          <span className={`h-2 w-2 rounded-full ${veg ? "bg-veg" : "bg-[#b91c1c]"}`} aria-hidden />
          {veg ? "Veg" : "Non-veg"}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-ink">
          <Link href={detailHref} className="hover:text-brand">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-muted">{packLabel(product)}</p>
        {showPrice && product.rateB2b > 0 ? (
          <p className="mt-2 text-base font-bold text-ink">{money(product.rateB2b)}</p>
        ) : null}
        <ProductCardActions
          sku={product.sku}
          name={product.name}
          packSize={packLabel(product)}
          rateB2b={product.rateB2b}
          category={product.category}
          imageUrl={img}
          enquireHref={enquireHref}
        />
      </div>
    </article>
  );
}
