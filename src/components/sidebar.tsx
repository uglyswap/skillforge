"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileText, Zap, BookOpen, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/scraper", label: "Scraper", icon: FileText },
  { href: "/skills", label: "Skills", icon: Zap },
  { href: "/templates", label: "Templates", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  userEmail: string;
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-white">
      <div className="p-4">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight">
          SkillForge
        </Link>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <p className="mb-2 truncate text-xs text-gray-500">{userEmail}</p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-gray-600"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
