"use client";

import { signOut } from "next-auth/react";
import { Search, Bell, LogOut, User } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export default function Header({ user }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg px-6 flex items-center gap-4">
      {/* Spacer for mobile hamburger */}
      <div className="w-10 lg:hidden" />

      {/* Spacer to push right section */}
      <div className="flex-1" />

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Notifications placeholder */}
        <button className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
          <Bell className="h-5 w-5" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-medium">
              {user?.name?.charAt(0) ?? "U"}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {user?.name ?? "User"}
              </p>
              <p className="text-[11px] text-zinc-500 capitalize">
                {user?.role?.toLowerCase() ?? "official"}
              </p>
            </div>
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl py-1 animate-fade-in">
                <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {user?.name}
                  </p>
                  <p className="text-xs text-zinc-500">{user?.email}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
