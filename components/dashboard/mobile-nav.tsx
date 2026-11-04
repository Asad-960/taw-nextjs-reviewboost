"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "./nav";
import { logout } from "@/app/actions/auth";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden print:hidden">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          <span className="font-semibold">ReviewBoost</span>
        </div>
        <button
          onClick={() => logout()}
          className="text-muted-foreground"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b px-2 py-2">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
