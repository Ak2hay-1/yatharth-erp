import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDate, qty } from "@/lib/utils";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";

export default async function PrintChallanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [company, dc] = await Promise.all([
    prisma.company.findUnique({ where: { id: "default" } }),
    prisma.deliveryChallan.findUnique({
      where: { id },
      include: {
        invoice: {
          include: { customer: true, lines: { include: { item: true, batch: true } } },
        },
      },
    }),
  ]);
  if (!company || !dc) notFound();
  const inv = dc.invoice;

  return (
    <div className="print-sheet mx-auto max-w-4xl p-8 text-sm">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <div className="border border-black">
        <div className="border-b border-black px-4 py-3 text-center">
          <img src="/media/logo.png?v=3" alt="YATHARTHA Foods & Beverages" className="mx-auto mb-2 h-10 w-auto bg-transparent object-contain" />
          <div className="text-xs uppercase tracking-widest">Delivery Challan</div>
          <div className="font-display text-2xl">{company.legalName}</div>
          <div className="text-xs">
            GSTIN: {company.gstin} · FSSAI: {company.fssai}
          </div>
        </div>
        <div className="grid grid-cols-2 border-b border-black p-3 text-xs">
          <div>
            <div className="font-semibold">Deliver to</div>
            <div>{inv.customer.name}</div>
            <div>{inv.customer.shippingAddress || inv.customer.billingAddress}</div>
          </div>
          <div>
            <div>Challan: {dc.number}</div>
            <div>Date: {formatDate(dc.date)}</div>
            <div>Against invoice: {inv.number}</div>
            {dc.vehicleNo ? <div>Vehicle: {dc.vehicleNo}</div> : null}
          </div>
        </div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="p-2">#</th>
              <th className="p-2">Item</th>
              <th className="p-2">Lot</th>
              <th className="p-2">Qty</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={l.id} className="border-b border-black/40">
                <td className="p-2">{i + 1}</td>
                <td className="p-2">{l.item.name}</td>
                <td className="p-2">{l.batch?.lotNo ?? ""}</td>
                <td className="p-2">{qty(l.qty, l.item.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 text-xs">
          Received the above goods in good condition.
          {dc.freezerOk || dc.sealOk ? (
            <div className="mt-2">
              Cold chain: freezer OK {dc.freezerOk ? "yes" : "—"} · seal OK {dc.sealOk ? "yes" : "—"}
              {dc.customerFreezerNote ? ` · ${dc.customerFreezerNote}` : ""}
            </div>
          ) : null}
        </div>
        <div className="flex justify-between p-3 text-xs">
          <div>Receiver signature</div>
          <div>For {company.legalName}</div>
        </div>
      </div>
    </div>
  );
}
