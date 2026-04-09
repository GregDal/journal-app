"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Brain,
  Home,
  Import,
  LineChart,
  LogOut,
  PenLine,
  Plus,
  Search,
  Settings,
  Sparkles,
  SunMedium,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/insights", label: "Insights", icon: LineChart },
  { href: "/import", label: "Import", icon: Import },
  { href: "/settings", label: "Settings", icon: Settings },
];

const ENTRY_TYPES = [
  { href: "/new/quick", label: "Quick Capture", icon: Zap, duration: "~5 min" },
  {
    href: "/new/reflection",
    label: "Reflection",
    icon: SunMedium,
    duration: "~15 min",
  },
  {
    href: "/new/comprehensive",
    label: "Comprehensive",
    icon: BookOpen,
    duration: "~1 hr",
  },
  { href: "/new/cbt", label: "CBT Work-through", icon: Brain, duration: "Ongoing" },
  { href: "/new/freeform", label: "Freeform", icon: PenLine, duration: "Any" },
  { href: "/new/ai_guided", label: "AI-Guided", icon: Sparkles, duration: "~20 min" },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="mb-4 px-3">
        <h1 className="text-lg font-semibold tracking-tight">Journal</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            active={
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            }
          />
        ))}
      </nav>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-3 text-muted-foreground"
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/login");
          router.refresh();
        }}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}

function FabMenu() {
  const pathname = usePathname();
  const hidden =
    pathname.startsWith("/new/") ||
    pathname.startsWith("/entries/") ||
    pathname.startsWith("/issues/");

  if (hidden) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
          <Plus className="h-6 w-6" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {ENTRY_TYPES.map((et) => (
            <DropdownMenuItem
              key={et.href}
              onClick={() => (window.location.href = et.href)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <et.icon className="h-4 w-4" />
              <div>
                <div className="text-sm font-medium">{et.label}</div>
                <div className="text-xs text-muted-foreground">
                  {et.duration}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-border md:block">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-56 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-4 border-b border-border px-4 py-3 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMobileOpen(true)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M2 4h12M2 8h12M2 12h12" />
            </svg>
          </Button>
          <h1 className="text-sm font-semibold">Journal</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>

        {/* FAB — new entry (hidden on entry/issue pages) */}
        <FabMenu />
      </div>
    </div>
  );
}
