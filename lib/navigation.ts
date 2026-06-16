import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  LayoutDashboard,
  Package,
  Puzzle,
  ShoppingCart,
  Store,
  Warehouse,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/vendors", label: "Vendors", icon: Store },
  { href: "/parts", label: "Parts", icon: Puzzle },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/vendor-pos", label: "Vendor POs", icon: ClipboardList },
];

export function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
