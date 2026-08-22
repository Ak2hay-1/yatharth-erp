"use client";

import { useState } from "react";
import type { ItemType, PartyKind } from "@prisma/client";
import { SearchableSelect, type SearchOption } from "@/components/searchable-select";
import { CreatableItemSelect, CreatablePartySelect } from "@/components/creatable-selects";
import type { CatalogItem } from "@/components/catalog-types";

export function NamedSearch({
  name,
  options,
  defaultValue = "",
  placeholder,
  required,
  create,
  canCreate = false,
  defaultKind = "CUSTOMER",
  defaultType = "FINISHED",
  items,
  createLabel,
  disabled,
}: {
  name: string;
  options?: SearchOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  /** Enable inline create modal for items or parties. */
  create?: "item" | "party";
  canCreate?: boolean;
  defaultKind?: PartyKind;
  defaultType?: ItemType;
  /** Required when create="item". */
  items?: CatalogItem[];
  createLabel?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);

  if (create === "item" && items) {
    return (
      <CreatableItemSelect
        name={name}
        value={value}
        onChange={setValue}
        items={items}
        placeholder={placeholder}
        required={required}
        canCreate={canCreate && !disabled}
        defaultType={defaultType}
        disabled={disabled}
      />
    );
  }

  if (create === "party" && options) {
    return (
      <CreatablePartySelect
        name={name}
        value={value}
        onChange={setValue}
        options={options}
        placeholder={placeholder}
        required={required}
        canCreate={canCreate && !disabled}
        defaultKind={defaultKind}
        createLabel={createLabel}
        disabled={disabled}
      />
    );
  }

  return (
    <SearchableSelect
      name={name}
      value={value}
      onChange={setValue}
      options={options ?? []}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
    />
  );
}
