"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/(auth)/actions";

// Nav vocabulary is fixed (§4): Home · Your Business · Tools · Account.
const TABS = [
  { href: "/home", label: "Home" },
  { href: "/your-business", label: "Your Business" },
  { href: "/tools", label: "Tools" },
  { href: "/account", label: "Account" },
] as const;

function Tabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-ink-100 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid h-16 max-w-[720px] grid-cols-4">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap flex h-full flex-col items-center justify-center text-xs font-medium",
                  active ? "text-ink-900" : "text-ink-500",
                )}
              >
                <span className={cn("mb-1 h-1 w-6 rounded-full", active ? "bg-honey-400" : "bg-transparent")} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Menu({ supportEmail }: { supportEmail?: string }) {
  const [open, setOpen] = useState(false);
  const support = supportEmail ?? "";
  return (
    <div className="relative">
      <button
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-xl hover:bg-ink-100"
      >
        ☰
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 mt-1 w-56 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-lg"
          onClick={() => setOpen(false)}
        >
          {[
            { href: "/your-business", label: "Your Business" },
            { href: "/site", label: "Your website" },
            { href: "/tools", label: "Tools" },
            { href: "/plan", label: "Your plan" },
            { href: "/account", label: "Account" },
          ].map((i) => (
            <li key={i.href}>
              <Link role="menuitem" href={i.href} className="tap flex items-center px-4 text-[15px] hover:bg-ink-100">
                {i.label}
              </Link>
            </li>
          ))}
          <li>
            <a role="menuitem" href={support ? `mailto:${support}` : "#"} className="tap flex items-center px-4 text-[15px] hover:bg-ink-100">
              Get help
            </a>
          </li>
          <li className="border-t border-ink-100">
            <form action={signOut}>
              <button role="menuitem" type="submit" className="tap flex w-full items-center px-4 text-left text-[15px] text-ink-500 hover:bg-ink-100">
                Sign out
              </button>
            </form>
          </li>
        </ul>
      )}
    </div>
  );
}

export { Tabs as AppNavTabs, Menu as AppNavMenu };
export const AppNav = { Tabs, Menu };
