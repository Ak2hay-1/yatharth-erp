import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { amountInWords, formatDate, money, qty } from "@/lib/utils";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [company, inv] = await Promise.all([
    prisma.company.findUnique({ where: { id: "default" } }),
    prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, lines: { include: { item: true, batch: true } } },
    }),
  ]);
  if (!company || !inv) notFound();

  return (
    <div className="print-sheet mx-auto max-w-4xl p-8 text-sm">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <div className="border border-black">
        <div className="border-b border-black px-4 py-3 text-center">
          <img src="/media/logo.png?v=4" alt="YATHARTHA Foods & Beverages" className="mx-auto mb-2 h-10 w-auto bg-transparent object-contain" />
          <div className="text-xs uppercase tracking-widest">Tax Invoice</div>
          <div className="font-display text-2xl">{company.legalName}</div>
          <div className="text-xs">
            {company.address}, {company.city}, {company.state} {company.pincode}
          </div>
          <div className="text-xs">
            GSTIN: {company.gstin} · FSSAI: {company.fssai} · {company.phone}
          </div>
        </div>
        <div className="grid grid-cols-2 border-b border-black text-xs">
          <div className="border-r border-black p-3">
            <div className="font-semibold">Bill to</div>
            <div className="font-medium">{inv.customer.name}</div>
            <div>{inv.customer.billingAddress}</div>
            <div>
              {inv.customer.city} {inv.customer.state} {inv.customer.pincode}
            </div>
            <div>GSTIN: {inv.customer.gstin || "Unregistered"}</div>
          </div>
          <div className="p-3">
            <div>Invoice no: {inv.number}</div>
            <div>Date: {formatDate(inv.date)}</div>
            <div>Place of supply: {inv.placeOfSupply}</div>
            <div>Channel: {inv.channel}</div>
          </div>
        </div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="p-2">#</th>
              <th className="p-2">Description</th>
              <th className="p-2">HSN</th>
              <th className="p-2">Lot</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Rate</th>
              <th className="p-2">Taxable</th>
              <th className="p-2">GST%</th>
              <th className="p-2">Tax</th>
              <th className="p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={l.id} className="border-b border-black/40">
                <td className="p-2">{i + 1}</td>
                <td className="p-2">{l.item.name}</td>
                <td className="p-2">{l.hsn}</td>
                <td className="p-2">{l.batch?.lotNo ?? ""}</td>
                <td className="p-2">{qty(l.qty, l.item.unit)}</td>
                <td className="p-2">{money(l.rate)}</td>
                <td className="p-2">{money(l.taxable)}</td>
                <td className="p-2">{l.gstRate}%</td>
                <td className="p-2">{money(l.cgst + l.sgst + l.igst)}</td>
                <td className="p-2">{money(l.taxable + l.cgst + l.sgst + l.igst)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-2 text-xs">
          <div className="border-r border-black p-3">
            <div className="font-semibold">Amount in words</div>
            <div>{amountInWords(inv.total)}</div>
            {company.bankName ? (
              <div className="mt-3">
                Bank: {company.bankName}
                <br />
                A/c {company.bankAccount} · IFSC {company.ifsc}
              </div>
            ) : null}
          </div>
          <div className="p-3 space-y-1">
            <div className="flex justify-between">
              <span>Taxable</span>
              <span>{money(inv.taxable)}</span>
            </div>
            <div className="flex justify-between">
              <span>CGST</span>
              <span>{money(inv.cgst)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST</span>
              <span>{money(inv.sgst)}</span>
            </div>
            <div className="flex justify-between">
              <span>IGST</span>
              <span>{money(inv.igst)}</span>
            </div>
            <div className="flex justify-between border-t border-black pt-1 font-semibold">
              <span>Grand total</span>
              <span>{money(inv.total)}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-between border-t border-black p-3 text-xs">
          <div>This is a computer generated invoice.</div>
          <div className="text-right">
            For {company.legalName}
            <div className="mt-10">Authorised signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
