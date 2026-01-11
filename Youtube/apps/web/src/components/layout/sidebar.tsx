"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Video,
  Home,
  Settings,
  FolderOpen,
  History,
  CreditCard,
  Rocket,
  Sparkles,
  Cog,
  Radio,
  FileStack,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  subItems?: { name: string; href: string; icon: React.ElementType }[];
}

const navigation: NavItem[] = [
  { name: "대시보드", href: "/", icon: Home },
  {
    name: "Mission Control",
    href: "/mission-control",
    icon: Rocket,
    subItems: [
      { name: "빠른 생성", href: "/mission-control?mode=quick-create", icon: Sparkles },
      { name: "상세 설정", href: "/mission-control?mode=detailed-config", icon: Cog },
      { name: "실행 모니터", href: "/mission-control?mode=execution", icon: Radio },
      { name: "세션 기록", href: "/mission-control?mode=session-history", icon: FileStack },
    ],
  },
  { name: "프로젝트", href: "/projects", icon: FolderOpen },
  { name: "히스토리", href: "/history", icon: History },
  { name: "비용", href: "/billing", icon: CreditCard },
  { name: "설정", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["Mission Control"]));

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const isActiveItem = (item: NavItem) => {
    if (item.subItems) {
      return pathname.startsWith(item.href.split("?")[0]);
    }
    return pathname === item.href;
  };

  const isActiveSubItem = (href: string) => {
    const url = new URL(href, "http://localhost");
    const basePath = url.pathname;
    const mode = url.searchParams.get("mode");

    if (pathname.startsWith(basePath)) {
      const currentMode = searchParams.get("mode");
      return mode === currentMode || (!currentMode && mode === "quick-create");
    }
    return false;
  };

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <Video className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold">AI Studio</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = isActiveItem(item);
          const isExpanded = expandedItems.has(item.name);
          const hasSubItems = item.subItems && item.subItems.length > 0;

          return (
            <div key={item.name}>
              {hasSubItems ? (
                <>
                  <button
                    onClick={() => toggleExpand(item.name)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                      {item.subItems?.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                            isActiveSubItem(subItem.href)
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <subItem.icon className="h-4 w-4" />
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t p-4">
        <div className="rounded-lg bg-accent/50 p-3">
          <p className="text-xs text-muted-foreground">현재 모델</p>
          <p className="text-sm font-medium">Gemini 3.0 Pro</p>
        </div>
      </div>
    </div>
  );
}
