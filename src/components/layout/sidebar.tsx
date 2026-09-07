"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  BookOpen,
  BarChart3,
  MessageSquareText,
  Settings,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Menu,
  X,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Building2,
  Calendar,
  BookOpen,
  BarChart3,
  MessageSquareText,
  Settings,
};

export default function Sidebar({ userRole }: { userRole?: string }) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleSection(title: string) {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((s) => s !== title) : [...prev, title]
    );
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function isSectionActive(item: (typeof NAV_ITEMS)[number]) {
    if ("href" in item && item.href) return isActive(item.href);
    if ("children" in item && item.children) {
      return item.children.some((child) => isActive(child.href));
    }
    return false;
  }

  const navContent = (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        if (item.adminOnly && userRole !== "ADMIN") return null;

        const Icon = iconMap[item.icon] ?? Settings;
        const hasChildren = "children" in item && item.children;
        const sectionActive = isSectionActive(item);
        const isExpanded = expandedSections.includes(item.title) || sectionActive;

        if (hasChildren) {
          return (
            <div key={item.title}>
              <button
                onClick={() => toggleSection(item.title)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  sectionActive
                    ? "bg-blue-600/10 text-blue-700 dark:text-blue-400"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1 text-left">{item.title}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {isExpanded && (
                <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-zinc-200 dark:border-zinc-800 pl-3">
                  {item.children?.map((child) => {
                    if (child.adminOnly && userRole !== "ADMIN") return null;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={`px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                          isActive(child.href)
                            ? "bg-blue-600/10 text-blue-700 dark:text-blue-400 font-medium"
                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {child.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const href = "href" in item ? item.href : "/";
        return (
          <Link
            key={item.title}
            href={href!}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(href!)
                ? "bg-blue-600/10 text-blue-700 dark:text-blue-400"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-zinc-900 text-white shadow-lg cursor-pointer"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-[260px] bg-sidebar flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 shrink-0">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base text-zinc-900 dark:text-zinc-100 truncate">UniRMS</h1>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
              Resource Management
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">{navContent}</div>

        {/* Footer */}
        <div className="px-5 py-4">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">UniRMS v1.0 • MVP</p>
        </div>
      </aside>
    </>
  );
}
