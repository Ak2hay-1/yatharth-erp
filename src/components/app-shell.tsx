"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { Role } from "@prisma/client";
import {
  Boxes,
  ClipboardList,
  Factory,
  FileText,
  FolderOpen,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  Wheat,
  IndianRupee,
  Tag,
  Image as ImageIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/auth-actions";
import {
  ALL_ROLES,
  can,
  FINANCE,
  MANAGEMENT,
  OPS,
  roleLabel,
  SUPER_ADMIN_ONLY,
} from "@/lib/permissions";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; roles: Role[] };
type NavGroup = { id: string; label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
      { href: "/help", label: "Help", icon: CircleHelp, roles: ALL_ROLES },
    ],
  },
  {
    id: "buy",
    label: "Buy",
    items: [
      { href: "/purchase/orders", label: "Purchase orders", icon: Truck, roles: OPS },
      { href: "/purchase/grn", label: "Goods receipt", icon: Truck, roles: OPS },
      { href: "/purchase/bills", label: "Supplier bills", icon: Wallet, roles: FINANCE },
    ],
  },
  {
    id: "make",
    label: "Make",
    items: [
      { href: "/inventory/stock", label: "Stock", icon: Boxes, roles: OPS },
      { href: "/inventory/batches", label: "Batches", icon: Boxes, roles: OPS },
      { href: "/inventory/moves", label: "Movements", icon: Boxes, roles: OPS },
      { href: "/production/orders", label: "Production", icon: Factory, roles: OPS },
      { href: "/production/batches", label: "Prod. batches", icon: Factory, roles: OPS },
    ],
  },
  {
    id: "sell",
    label: "Sell",
    items: [
      { href: "/sales/orders", label: "Sales orders", icon: ShoppingCart, roles: OPS },
      { href: "/sales/samples", label: "Samples & trials", icon: ShoppingCart, roles: OPS },
      { href: "/sales/counter", label: "Counter sale", icon: ShoppingCart, roles: OPS },
      { href: "/sales/invoices", label: "Invoices", icon: ShoppingCart, roles: OPS },
    ],
  },
  {
    id: "money",
    label: "Money",
    items: [
      { href: "/payments", label: "Payments", icon: Wallet, roles: FINANCE },
      { href: "/reports", label: "Reports", icon: ClipboardList, roles: FINANCE },
    ],
  },
  {
    id: "quality",
    label: "Quality",
    items: [
      { href: "/quality/complaints", label: "Complaints", icon: ClipboardList, roles: OPS },
      { href: "/quality/sops", label: "SOPs", icon: FileText, roles: OPS },
      { href: "/quality/documents", label: "Documents", icon: FolderOpen, roles: OPS },
    ],
  },
  {
    id: "masters",
    label: "Masters",
    items: [
      { href: "/masters/items", label: "Items", icon: Wheat, roles: ALL_ROLES },
      { href: "/masters/parties", label: "Parties", icon: Users, roles: ALL_ROLES },
      { href: "/masters/recipes", label: "Recipes", icon: ClipboardList, roles: MANAGEMENT },
      { href: "/masters/costing", label: "Product costing", icon: IndianRupee, roles: FINANCE },
      { href: "/masters/labelling", label: "Labelling", icon: Tag, roles: MANAGEMENT },
      { href: "/masters/media", label: "Product images", icon: ImageIcon, roles: OPS },
    ],
  },
  {
    id: "setup",
    label: "Setup",
    items: [{ href: "/settings", label: "Settings", icon: Settings, roles: SUPER_ADMIN_ONLY }],
  },
];

export function AppShell({
  children,
  companyName,
  user,
}: {
  children: React.ReactNode;
  companyName: string;
  user: { name: string; email: string; role: Role };
}) {
  const pathname = usePathname();
  const groups = useMemo(() => {
    const filtered = GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((n) => can(user.role, n.roles)),
    })).filter((g) => g.items.length > 0);
    return filtered.length > 0 ? filtered : GROUPS;
  }, [user.role]);
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.id, true])),
  );

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col bg-forest text-white">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex flex-col items-center">
            <BrandLogo height={48} className="mx-auto max-w-[220px]" priority />
            {companyName && companyName !== `${BRAND_NAME} ${BRAND_TAGLINE}` ? (
              <p className="mt-2 max-w-[220px] text-center text-[11px] leading-snug text-white/50">
                {companyName}
              </p>
            ) : null}
          </div>
          <form action="/search" className="relative mt-4">
            <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-white/40" />
            <input
              name="q"
              placeholder="Invoice, party, SKU"
              aria-label="Search"
              className="w-full rounded-lg border border-white/15 bg-white/10 py-2 pl-9 pr-3 text-xs text-white placeholder:text-white/40 outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/30"
            />
          </form>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => {
            const expanded = open[group.id] ?? true;
            return (
              <div key={group.id} className="mb-3">
                <button
                  type="button"
                  className="mb-1 w-full px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55"
                  onClick={() => setOpen((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                >
                  {group.label}
                </button>
                {expanded
                  ? group.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm leading-none",
                            active
                              ? "bg-sprout font-semibold text-ink"
                              : "text-white/80 hover:bg-white/5 hover:text-white",
                          )}
                        >
                          <Icon size={16} className="shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })
                  : null}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <div className="truncate text-sm font-medium text-white">{user.name}</div>
          <div className="truncate text-xs text-white/50">{roleLabel(user.role)}</div>
          <form action={logoutAction} className="mt-3">
            <button className="inline-flex items-center gap-2 text-xs font-medium text-saffron hover:text-white">
              <LogOut size={14} /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="ml-72 min-h-screen px-8 py-8">{children}</main>
    </div>
  );
}
