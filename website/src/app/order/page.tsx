import type { Metadata } from "next";
import { OrderReview } from "@/components/order-review";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Your order",
  description: `Review your order and send it to ${SITE_NAME} via WhatsApp or enquiry.`,
};

export default function OrderPage() {
  return (
    <div className="min-h-full bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="font-display text-4xl text-neutral-900">Your order</h1>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Review items, fill in your details, and place the order. We save your enquiry and open WhatsApp with a
            ready-made message.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14">
        <OrderReview />
      </div>
    </div>
  );
}
