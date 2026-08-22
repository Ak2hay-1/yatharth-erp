"use client";

import { useEffect, useMemo, useState } from "react";
import type { ItemType, PartyKind } from "@prisma/client";
import { Modal } from "@/components/modal";
import { ItemForm, PartyForm } from "@/components/item-party-forms";
import { SearchableSelect, type SearchOption } from "@/components/searchable-select";
import type { CatalogItem } from "@/components/catalog-types";
import { createItemQuick } from "@/server/items";
import { createPartyQuick } from "@/server/parties";

export type { CatalogItem };

function itemOption(item: CatalogItem): SearchOption {
  return {
    id: item.id,
    label: `${item.sku} — ${item.name}`,
    sub: `${item.unit} · GST ${item.gstRate}%`,
  };
}

function partyOption(p: { id: string; name: string; phone?: string; city?: string }): SearchOption {
  return {
    id: p.id,
    label: p.name,
    sub: [p.phone, p.city].filter(Boolean).join(" · ") || undefined,
  };
}

export function CreatableItemSelect({
  name,
  value,
  onChange,
  items,
  onItemsChange,
  placeholder = "Type SKU or name",
  required,
  disabled,
  canCreate = false,
  defaultType = "FINISHED",
}: {
  name?: string;
  value: string;
  onChange: (id: string) => void;
  items: CatalogItem[];
  onItemsChange?: (items: CatalogItem[]) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  canCreate?: boolean;
  defaultType?: ItemType;
}) {
  const [catalog, setCatalog] = useState(items);
  const [modalOpen, setModalOpen] = useState(false);
  const [seedName, setSeedName] = useState("");

  useEffect(() => {
    setCatalog((prev) => {
      const parentIds = new Set(items.map((i) => i.id));
      const extras = prev.filter((i) => !parentIds.has(i.id));
      return [...items, ...extras];
    });
  }, [items]);

  const options = useMemo(() => catalog.map(itemOption), [catalog]);

  function openCreate(query: string) {
    setSeedName(query);
    setModalOpen(true);
  }

  async function handleCreate(formData: FormData) {
    const created = await createItemQuick(formData);
    const next: CatalogItem = {
      id: created.id,
      sku: created.sku,
      name: created.name,
      unit: created.unit,
      sellingPrice: created.sellingPrice,
      purchasePrice: created.purchasePrice,
      gstRate: created.gstRate,
      type: created.type,
    };
    const merged = catalog.some((i) => i.id === next.id) ? catalog : [...catalog, next];
    setCatalog(merged);
    onItemsChange?.(merged);
    onChange(next.id);
    setModalOpen(false);
    setSeedName("");
  }

  return (
    <>
      <SearchableSelect
        name={name}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        createLabel={canCreate ? "Add new product" : undefined}
        onRequestCreate={canCreate ? openCreate : undefined}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add product">
        <ItemForm
          key={`item-seed-${seedName}-${defaultType}`}
          action={handleCreate}
          seed={{ name: seedName || undefined, type: defaultType }}
        />
      </Modal>
    </>
  );
}

export function CreatablePartySelect({
  name,
  value,
  onChange,
  options: initialOptions,
  placeholder = "Search party…",
  required,
  disabled,
  canCreate = false,
  defaultKind = "CUSTOMER",
  createLabel = "Add new party",
}: {
  name?: string;
  value: string;
  onChange: (id: string) => void;
  options: SearchOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  canCreate?: boolean;
  defaultKind?: PartyKind;
  createLabel?: string;
}) {
  const [options, setOptions] = useState(initialOptions);
  const [modalOpen, setModalOpen] = useState(false);
  const [seedName, setSeedName] = useState("");

  useEffect(() => {
    setOptions((prev) => {
      const parentIds = new Set(initialOptions.map((o) => o.id));
      const extras = prev.filter((o) => !parentIds.has(o.id));
      return [...initialOptions, ...extras];
    });
  }, [initialOptions]);

  function openCreate(query: string) {
    setSeedName(query);
    setModalOpen(true);
  }

  async function handleCreate(formData: FormData) {
    const created = await createPartyQuick(formData);
    const opt = partyOption(created);
    setOptions((prev) => (prev.some((o) => o.id === opt.id) ? prev : [...prev, opt]));
    onChange(created.id);
    setModalOpen(false);
    setSeedName("");
  }

  return (
    <>
      <SearchableSelect
        name={name}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        createLabel={canCreate ? createLabel : undefined}
        onRequestCreate={canCreate ? openCreate : undefined}
      />
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={defaultKind === "SUPPLIER" ? "Add supplier" : "Add customer"}
      >
        <PartyForm
          key={`party-seed-${seedName}-${defaultKind}`}
          action={handleCreate}
          seed={{ name: seedName || undefined, kind: defaultKind }}
        />
      </Modal>
    </>
  );
}
