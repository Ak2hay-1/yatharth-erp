import { round2 } from "@/lib/utils";

export type TaxLineInput = {
  qty: number;
  rate: number;
  gstRate: number;
};

export type TaxLine = {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  amount: number;
};

export function effectiveGstRate(itemGstRate: number, gstEnabled: boolean) {
  return gstEnabled ? itemGstRate : 0;
}

export function taxLine(input: TaxLineInput, interstate: boolean): TaxLine {
  const taxable = round2(input.qty * input.rate);
  const gst = round2((taxable * input.gstRate) / 100);
  if (gst <= 0) {
    return { taxable, cgst: 0, sgst: 0, igst: 0, amount: taxable };
  }
  if (interstate) {
    return { taxable, cgst: 0, sgst: 0, igst: gst, amount: round2(taxable + gst) };
  }
  const half = round2(gst / 2);
  const cgst = half;
  const sgst = round2(gst - half);
  return { taxable, cgst, sgst, igst: 0, amount: round2(taxable + cgst + sgst) };
}

export function assertGstReady(company: { gstEnabled: boolean; gstin: string }) {
  if (company.gstEnabled && !company.gstin.trim()) {
    throw new Error("GST is enabled but company GSTIN is blank. Set GSTIN in Settings, or turn off Charge GST.");
  }
}

export function sumTax(lines: TaxLine[]) {
  return lines.reduce(
    (acc, l) => ({
      taxable: round2(acc.taxable + l.taxable),
      cgst: round2(acc.cgst + l.cgst),
      sgst: round2(acc.sgst + l.sgst),
      igst: round2(acc.igst + l.igst),
      total: round2(acc.total + l.amount),
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  );
}

export function isInterstate(companyStateCode: string, partyStateCode: string) {
  if (!partyStateCode) return false;
  return companyStateCode !== partyStateCode;
}
