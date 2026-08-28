import type { CartItem } from "@/lib/cart";
import { money } from "@/lib/api";

export type OrderCustomer = {
  name: string;
  email: string;
  phone: string;
  business: string;
  deliveryArea: string;
  notes: string;
};

export function buildOrderMessage(items: CartItem[], customer: OrderCustomer): string {
  const lines: string[] = ["[Website order]", "", "Hello Yathartha Foods,", "", "I would like to place an order:", ""];

  let total = 0;
  for (const item of items) {
    const lineTotal = item.rateB2b * item.quantity;
    total += lineTotal;
    const pack = item.packSize || "pkt";
    if (item.rateB2b > 0) {
      lines.push(`• ${item.name} — ${item.quantity} ${pack} × ${money(item.rateB2b)} = ${money(lineTotal)}`);
    } else {
      lines.push(`• ${item.name} — ${item.quantity} ${pack}`);
    }
  }

  lines.push("");
  if (total > 0) {
    lines.push(`Estimated total: ${money(total)}`);
    lines.push("");
  }

  lines.push(`Name: ${customer.name}`);
  if (customer.business.trim()) lines.push(`Business: ${customer.business.trim()}`);
  lines.push(`Email: ${customer.email}`);
  if (customer.phone.trim()) lines.push(`Phone: ${customer.phone.trim()}`);
  if (customer.deliveryArea.trim()) lines.push(`Delivery area: ${customer.deliveryArea.trim()}`);
  if (customer.notes.trim()) {
    lines.push("");
    lines.push(`Notes: ${customer.notes.trim()}`);
  }

  return lines.join("\n");
}

export function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
