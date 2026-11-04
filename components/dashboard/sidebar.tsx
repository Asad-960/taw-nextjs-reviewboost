"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "./nav";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function Sidebar({ businessName }: { businessName?: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex print:hidden">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Star className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">ReviewBoost</span>
      </div>
      <div className="border-b px-6 py-3">
        <p className="truncate text-sm font-medium">
          {businessName ?? "Set up your business"}
        </p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
