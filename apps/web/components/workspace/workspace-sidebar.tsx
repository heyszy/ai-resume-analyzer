"use client";

import { BriefcaseBusiness, LayoutDashboard, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "首页",
    icon: LayoutDashboard,
  },
  {
    href: "/candidates",
    label: "候选人",
    icon: Users,
  },
  {
    href: "/jds",
    label: "职位",
    icon: BriefcaseBusiness,
  },
];

export function WorkspaceSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-border/60 bg-background/75 px-4 py-5 backdrop-blur-xl lg:border-b-0 lg:bg-transparent lg:px-5 lg:py-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-slate-950">AI Resume Analyzer</p>
          <p className="text-xs text-muted-foreground">Recruiting</p>
        </div>
      </div>

      <Separator className="my-5 bg-border/70" />

      <nav className="space-y-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Button
              key={item.href}
              asChild
              variant={active ? "default" : "ghost"}
              className={cn(
                "h-auto w-full justify-start rounded-2xl px-3 py-3 text-left",
                active && "shadow-sm",
              )}
            >
              <Link href={item.href}>
                <Icon className="size-4" />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
              </Link>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
