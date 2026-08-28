"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { money, submitContact } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { buildOrderMessage, buildWhatsAppUrl, type OrderCustomer } from "@/lib/order-message";

const emptyCustomer: OrderCustomer = {
  name: "",
  email: "",
  phone: "",
  business: "",
  deliveryArea: "",
  notes: "",
};

function CartItemThumb({ item }: { item: { name: string; category: string; imageUrl?: string } }) {
  const isVeg = item.category === "veg" || item.category === "potato-veg";

  if (item.imageUrl) {
    return (
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
      </div>
    );
  }

  return (
    <div
      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase ${
        isVeg ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"
      }`}
    >
      {isVeg ? "Veg" : "Non-veg"}
    </div>
  );
}

export function OrderReview() {
  const { items, hydrated, subtotal, setQuantity, removeItem, clearCart, whatsAppPhone } = useCart();
  const [customer, setCustomer] = useState<OrderCustomer>(emptyCustomer);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const message = useMemo(
    () => (items.length > 0 ? buildOrderMessage(items, customer) : ""),
    [items, customer],
  );

  const whatsAppUrl = useMemo(
    () => (message ? buildWhatsAppUrl(whatsAppPhone, message) : ""),
    [message, whatsAppPhone],
  );

  function updateField(field: keyof OrderCustomer, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  function openWhatsApp() {
    if (!whatsAppUrl) return;
    window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
  }

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;

    setPending(true);
    setStatus(null);

    const res = await submitContact({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || undefined,
      message,
    });

    setPending(false);

    if (res.ok) {
      clearCart();
      setCustomer(emptyCustomer);
      setStatus({ type: "success", text: "Order submitted — opening WhatsApp so you can confirm with us." });
      openWhatsApp();
    } else {
      setStatus({
        type: "error",
        text: res.error ?? "Could not save order. You can still send it on WhatsApp.",
      });
    }
  }

  if (!hydrated) {
    return (
      <p className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-neutral-500">Loading your order…</p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-neutral-800">Your order is empty</p>
        <p className="mt-2 text-sm text-neutral-500">Browse our catalogue and add products to place an order.</p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-lg bg-[#FE7733] px-6 py-3 text-sm font-semibold text-white hover:brightness-110"
        >
          View products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Order items</h2>
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.sku}
              className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <CartItemThumb item={item} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-900">{item.name}</p>
                <p className="text-xs text-neutral-500">{item.packSize || "Per packet"}</p>
                {item.rateB2b > 0 ? (
                  <p className="mt-1 text-sm text-neutral-600">{money(item.rateB2b)} / pkt</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-neutral-500">
                    Qty
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={item.quantity}
                      onChange={(e) => setQuantity(item.sku, Number(e.target.value) || 1)}
                      className="w-16 rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm"
                    />
                  </label>
                  {item.rateB2b > 0 ? (
                    <span className="text-sm font-semibold text-[#FE7733]">
                      {money(item.rateB2b * item.quantity)}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeItem(item.sku)}
                    className="text-xs text-neutral-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {subtotal > 0 ? (
          <p className="text-right text-lg font-bold text-neutral-900">Estimated total: {money(subtotal)}</p>
        ) : null}
      </div>

      <form onSubmit={handlePlaceOrder} className="space-y-4 lg:col-span-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Your details</h2>
        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <label className="block text-sm">
            <span className="text-neutral-500">Name *</span>
            <input
              required
              value={customer.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-500">Email *</span>
            <input
              type="email"
              required
              value={customer.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-500">Phone</span>
            <input
              value={customer.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-500">Business / outlet</span>
            <input
              value={customer.business}
              onChange={(e) => updateField("business", e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-500">Delivery area</span>
            <input
              value={customer.deliveryArea}
              onChange={(e) => updateField("deliveryArea", e.target.value)}
              placeholder="e.g. Wakad, Pune"
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-500">Notes</span>
            <textarea
              rows={2}
              value={customer.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-neutral-700">Order message preview</p>
          <textarea
            readOnly
            rows={10}
            value={message}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs leading-relaxed text-neutral-700"
          />
        </div>

        <div className="space-y-2">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-[#FE7733] py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Place order"}
          </button>
          <button
            type="button"
            onClick={openWhatsApp}
            className="w-full rounded-lg border border-[#25D366] bg-[#25D366]/10 py-3 text-sm font-semibold text-[#128C7E] hover:bg-[#25D366]/20"
          >
            Send on WhatsApp only
          </button>
        </div>

        {status ? (
          <p className={`text-sm ${status.type === "success" ? "text-emerald-600" : "text-amber-700"}`}>
            {status.text}
          </p>
        ) : null}
      </form>
    </div>
  );
}
