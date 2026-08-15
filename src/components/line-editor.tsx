"use client";

import { useMemo, useState } from "react";
import type { ItemType } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { CreatableItemSelect } from "@/components/creatable-selects";
import type { CatalogItem } from "@/components/catalog-types";
import type { StockHint } from "@/server/stock";
import { formatDate, qty } from "@/lib/utils";

export type { CatalogItem };
export type LineRow = {
  itemId: string;
  qty: string;
  rate: string;
  lotNo?: string;
  mfgDate?: string;
  expiryDate?: string;
};

export function LineEditor({
  items,
  initial,
  rateField = "sellingPrice",
  showLot = false,
  showStock = false,
  stockHints,
  name = "lines",
  canCreate = false,
  defaultType = "FINISHED",
}: {
  items: CatalogItem[];
  initial?: LineRow[];
  rateField?: "sellingPrice" | "purchasePrice";
  showLot?: boolean;
  showStock?: boolean;
  stockHints?: Record<string, StockHint>;
  name?: string;
  canCreate?: boolean;
  defaultType?: ItemType;
}) {
  const [rows, setRows] = useState<LineRow[]>(
    initial?.length
      ? initial
      : [{ itemId: "", qty: "1", rate: "", lotNo: "", mfgDate: "", expiryDate: "" }],
  );
  const [catalog, setCatalog] = useState(items);

  const byId = useMemo(() => Object.fromEntries(catalog.map((i) => [i.id, i])), [catalog]);

  function update(i: number, patch: Partial<LineRow>) {
    setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function onItem(i: number, itemId: string) {
    const item = byId[itemId] ?? catalog.find((c) => c.id === itemId);
    update(i, {
      itemId,
      rate: item ? String(item[rateField] || "") : "",
    });
  }

  function addLine() {
    setRows((prev) => [
      ...prev,
      { itemId: "", qty: "1", rate: "", lotNo: "", mfgDate: "", expiryDate: "" },
    ]);
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-bg text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="w-28 px-3 py-2 text-left">Qty</th>
              <th className="w-32 px-3 py-2 text-left">Rate</th>
              {showLot ? (
                <>
                  <th className="w-36 px-3 py-2 text-left">Lot</th>
                  <th className="w-36 px-3 py-2 text-left">Mfg</th>
                  <th className="w-36 px-3 py-2 text-left">Expiry</th>
                </>
              ) : null}
              <th className="w-12 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const item = byId[row.itemId];
              const hint = row.itemId ? stockHints?.[row.itemId] : undefined;
              const needed = Number(row.qty) || 0;
              const short = showStock && hint && needed > hint.onHand + 0.0005;
              const none = showStock && row.itemId && !hint;
              return (
                <tr key={i} className="border-t border-line">
                  <td className="px-2 py-2">
                    <CreatableItemSelect
                      value={row.itemId}
                      onChange={(id) => onItem(i, id)}
                      items={catalog}
                      onItemsChange={setCatalog}
                      placeholder="Type SKU or name"
                      canCreate={canCreate}
                      defaultType={defaultType}
                    />
                    {item ? (
                      <div className="mt-1 text-xs text-muted">
                        {item.unit} · GST {item.gstRate}%
                      </div>
                    ) : null}
                    {showStock && hint ? (
                      <div className={`mt-1 text-xs ${short ? "font-semibold text-bad" : "text-muted"}`}>
                        On hand {qty(hint.onHand, hint.unit)}
                        {hint.nearestExpiry
                          ? ` · FEFO ${hint.lotNo} exp ${formatDate(hint.nearestExpiry)}`
                          : ""}
                        {short ? " — short" : ""}
                      </div>
                    ) : null}
                    {none ? <div className="mt-1 text-xs font-semibold text-bad">No stock</div> : null}
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={row.qty}
                      onChange={(e) => update(i, { qty: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addLine();
                        }
                      }}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.rate}
                      onChange={(e) => update(i, { rate: e.target.value })}
                    />
                  </td>
                  {showLot ? (
                    <>
                      <td className="px-2 py-2">
                        <Input
                          value={row.lotNo ?? ""}
                          onChange={(e) => update(i, { lotNo: e.target.value })}
                          placeholder="LOT-001"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="date"
                          value={row.mfgDate ?? ""}
                          onChange={(e) => update(i, { mfgDate: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="date"
                          value={row.expiryDate ?? ""}
                          onChange={(e) => update(i, { expiryDate: e.target.value })}
                        />
                      </td>
                    </>
                  ) : null}
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className="rounded-md p-2 text-muted hover:bg-red-50 hover:text-bad"
                      onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="Remove line"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="secondary" onClick={addLine}>
        <Plus size={16} /> Add line
      </Button>
    </div>
  );
}
