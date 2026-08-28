"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  sku: string;
  name: string;
  packSize: string;
  rateB2b: number;
  category: string;
  imageUrl?: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (sku: string, quantity: number) => void;
  removeItem: (sku: string) => void;
  clearCart: () => void;
  whatsAppPhone: string;
};

const STORAGE_KEY = "yatharth-order-cart";

const CartContext = createContext<CartContextValue | null>(null);

function loadStoredItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.sku === "string" &&
        typeof item.name === "string" &&
        typeof item.quantity === "number" &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

function persistItems(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children, whatsAppPhone }: { children: ReactNode; whatsAppPhone: string }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadStoredItems());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistItems(items);
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    const qty = Math.max(1, Math.floor(quantity));
    setItems((prev) => {
      const existing = prev.find((i) => i.sku === item.sku);
      if (existing) {
        return prev.map((i) => (i.sku === item.sku ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [...prev, { ...item, quantity: qty }];
    });
  }, []);

  const setQuantity = useCallback((sku: string, quantity: number) => {
    const qty = Math.floor(quantity);
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.sku !== sku));
      return;
    }
    setItems((prev) => prev.map((i) => (i.sku === sku ? { ...i, quantity: qty } : i)));
  }, []);

  const removeItem = useCallback((sku: string) => {
    setItems((prev) => prev.filter((i) => i.sku !== sku));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.rateB2b * i.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      hydrated,
      itemCount,
      subtotal,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      whatsAppPhone,
    }),
    [items, hydrated, itemCount, subtotal, addItem, setQuantity, removeItem, clearCart, whatsAppPhone],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
