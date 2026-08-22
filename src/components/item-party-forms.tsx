import { GST_RATES, INDIAN_STATES, UNITS, toInputDate } from "@/lib/utils";
import type { Item, Party } from "@prisma/client";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { BUYER_CLUSTERS, PACK_TYPES, PARTY_LIFECYCLES, PRODUCT_LANES, SKU_TIERS } from "@/lib/labels";

export type ItemFormSeed = {
  sku?: string;
  name?: string;
  type?: Item["type"];
};

export function ItemForm({
  action,
  item,
  seed,
}: {
  action: (formData: FormData) => void | Promise<void>;
  item?: Item;
  seed?: ItemFormSeed;
}) {
  return (
    <ActionForm action={action} className="grid gap-4 md:grid-cols-2">
      <Field label="SKU">
        <Input name="sku" required defaultValue={item?.sku ?? seed?.sku} placeholder="FG-PATTY-VEG-10" />
      </Field>
      <Field label="Name">
        <Input
          name="name"
          required
          defaultValue={item?.name ?? seed?.name}
          placeholder="Veg burger patty 80g (10 pcs)"
        />
      </Field>
      <Field label="Type">
        <Select name="type" defaultValue={item?.type ?? seed?.type ?? "FINISHED"} required>
          <option value="FINISHED">Finished goods</option>
          <option value="RAW">Raw material</option>
          <option value="PACKING">Packing</option>
        </Select>
      </Field>
      <Field label="Unit">
        <Select name="unit" defaultValue={item?.unit ?? "pcs"} required>
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </Select>
      </Field>
      <Field label="HSN">
        <Input name="hsn" defaultValue={item?.hsn} placeholder="1601" />
      </Field>
      <Field label="GST %">
        <Select name="gstRate" defaultValue={String(item?.gstRate ?? 5)}>
          {GST_RATES.map((r) => (
            <option key={r} value={r}>
              {r}%
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Shelf life (days)">
        <Input name="shelfLifeDays" type="number" min="1" defaultValue={item?.shelfLifeDays ?? 30} />
      </Field>
      <Field label="Reorder level">
        <Input name="reorderLevel" type="number" step="0.001" defaultValue={item?.reorderLevel ?? 0} />
      </Field>
      <Field label="Selling price">
        <Input name="sellingPrice" type="number" step="0.01" defaultValue={item?.sellingPrice ?? 0} />
      </Field>
      <Field label="Purchase price">
        <Input name="purchasePrice" type="number" step="0.01" defaultValue={item?.purchasePrice ?? 0} />
      </Field>
      <Field label="Product lane">
        <Select name="lane" defaultValue={item?.lane ?? "NONE"}>
          {PRODUCT_LANES.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="SKU tier">
        <Select name="tier" defaultValue={item?.tier ?? "NONE"}>
          {SKU_TIERS.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Pack type">
        <Select name="packType" defaultValue={item?.packType ?? "NONE"}>
          {PACK_TYPES.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Pack size">
        <Input name="packSize" defaultValue={item?.packSize} placeholder="1 kg / 2 kg / 5 kg / 500 g" />
      </Field>
      <Field label="Units per packet">
        <Input name="unitsPerPkt" type="number" min={1} step={1} defaultValue={item?.unitsPerPkt ?? 1} />
      </Field>
      <div className="md:col-span-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">SKU gate — keep only if all pass</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["gateTaste", "Taste", item?.gateTaste],
            ["gateCost", "Cost", item?.gateCost],
            ["gateMargin", "Margin", item?.gateMargin],
            ["gateProduction", "Production", item?.gateProduction],
            ["gatePackaging", "Packaging", item?.gatePackaging],
            ["gateShelfLife", "Shelf life", item?.gateShelfLife],
            ["gateAcceptance", "Customer acceptance", item?.gateAcceptance],
            ["gateRepeat", "Repeat order", item?.gateRepeat],
          ].map(([name, label, checked]) => (
            <label key={String(name)} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={String(name)} defaultChecked={Boolean(checked)} className="accent-[var(--saffron,#fe7733)]" />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div className="md:col-span-2">
        <SubmitButton>{item ? "Save item" : "Create item"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export type PartyFormSeed = {
  name?: string;
  kind?: Party["kind"];
};

export function PartyForm({
  action,
  party,
  seed,
}: {
  action: (formData: FormData) => void | Promise<void>;
  party?: Party;
  seed?: PartyFormSeed;
}) {
  const stateValue = party ? `${party.stateCode}|${party.state}` : "27|Maharashtra";
  return (
    <ActionForm action={action} className="grid gap-4 md:grid-cols-2">
      <Field label="Name" className="md:col-span-2">
        <Input name="name" required defaultValue={party?.name ?? seed?.name} />
      </Field>
      <Field label="Kind">
        <Select name="kind" defaultValue={party?.kind ?? seed?.kind ?? "CUSTOMER"} required>
          <option value="CUSTOMER">Customer</option>
          <option value="SUPPLIER">Supplier</option>
          <option value="BOTH">Both</option>
        </Select>
      </Field>
      <Field label="Sales channel (customers)">
        <Select name="channel" defaultValue={party?.channel ?? "B2B"}>
          <option value="B2B">B2B</option>
          <option value="B2C">B2C</option>
        </Select>
      </Field>
      <Field label="Buyer cluster">
        <Select name="cluster" defaultValue={party?.cluster ?? "NONE"}>
          {BUYER_CLUSTERS.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Lifecycle">
        <Select name="lifecycle" defaultValue={party?.lifecycle ?? "CUSTOMER"}>
          {PARTY_LIFECYCLES.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="GSTIN">
        <Input name="gstin" defaultValue={party?.gstin} />
      </Field>
      <Field label="Phone">
        <Input name="phone" defaultValue={party?.phone} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={party?.email} />
      </Field>
      <Field label="State">
        <Select name="state" defaultValue={stateValue}>
          {INDIAN_STATES.map((s) => (
            <option key={s.code} value={`${s.code}|${s.name}`}>
              {s.code} — {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="City">
        <Input name="city" defaultValue={party?.city} />
      </Field>
      <Field label="PIN">
        <Input name="pincode" defaultValue={party?.pincode} />
      </Field>
      <Field label="Credit limit">
        <Input name="creditLimit" type="number" step="0.01" defaultValue={party?.creditLimit ?? 0} />
      </Field>
      <Field label="Payment terms (days)">
        <Input name="paymentTermsDays" type="number" min="0" defaultValue={party?.paymentTermsDays ?? 30} />
      </Field>
      <Field label="Reorder cycle (days)">
        <Input name="reorderCycleDays" type="number" min="1" defaultValue={party?.reorderCycleDays ?? 30} />
      </Field>
      <Field label="Next reorder date">
        <Input name="nextReorderDate" type="date" defaultValue={party?.nextReorderDate ? toInputDate(party.nextReorderDate) : ""} />
      </Field>
      <Field label="Why they did not reorder" className="md:col-span-2">
        <Input name="lostReason" defaultValue={party?.lostReason} placeholder="Price / quality / supply / switched" />
      </Field>
      <Field label="Billing address" className="md:col-span-2">
        <Textarea name="billingAddress" defaultValue={party?.billingAddress} />
      </Field>
      <Field label="Shipping address" className="md:col-span-2">
        <Textarea name="shippingAddress" defaultValue={party?.shippingAddress} />
      </Field>
      <div className="md:col-span-2">
        <SubmitButton>{party ? "Save party" : "Create party"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
