'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Calendar,
  Users,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  LucideIcon,
} from "lucide-react";
import { useState } from "react";

type Item = { Icon: LucideIcon; label: string; href: string };

const ITEMS: Item[] = [
  { Icon: LayoutDashboard, label: "Dashboard", href: "/school-admin" },
  { Icon: GraduationCap, label: "Students", href: "/school-admin/students" },
  { Icon: Calendar, label: "Sessions", href: "/school-admin/sessions" },
  { Icon: Users, label: "Instructors", href: "/school-admin/instructors" },
  { Icon: DollarSign, label: "Billing", href: "/school-admin/billing" },
  { Icon: Settings, label: "Settings", href: "/school-admin/settings" },
];
function isActive(href: string, pathname: string) {
  if (href === "/school-admin") return pathname === "/school-admin" || pathname === "/school-admin/";
  return pathname.startsWith(href);
}

/**
 * Sidebar — Coinstax-style left nav with active-state highlighting.
 * Mobile-collapsible (off-canvas). Uses lucide icons, monoline style.
 */
export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          className="rs-dash-sidebar-backdrop"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`rs-dash-sidebar${open ? " is-open" : ""}`}>
        <div className="rs-dash-sidebar-head">
          <Link href="/school-admin" className="rs-dash-brand-link" onClick={() => setOpen(false)}>
            <span className="rs-dash-brand-road">ROAD</span>
            <span className="rs-dash-brand-smith">SMITH</span>
          </Link>
          <button
            type="button"
            className="rs-dash-sidebar-close"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="rs-dash-nav">
          {ITEMS.map(({ Icon, label, href }) => {
            const active = isActive(href, pathname);
            return (
              <Link
                key={label}
                href={href}
                className={`rs-dash-nav-item${active ? " active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="rs-dash-sidebar-foot">
          <button type="button" className="rs-dash-nav-item rs-dash-logout">
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <button
        type="button"
        className="rs-dash-mobile-menu-btn"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu size={20} />
      </button>
    </>
  );
}