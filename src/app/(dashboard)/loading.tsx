import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="h-[calc(100vh-8rem)] w-full flex flex-col items-center justify-center animate-fade-in">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing rings */}
        <div className="absolute inset-0 rounded-full blur-xl bg-blue-500/20 animate-pulse" />
        <div className="absolute inset-[-10px] rounded-full blur-2xl bg-indigo-500/10 animate-pulse delay-150" />

        {/* Main spinner circle */}
        <div className="relative bg-white dark:bg-zinc-900 shadow-xl dark:shadow-2xl ring-1 ring-zinc-200 dark:ring-zinc-800 rounded-full p-4">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-1.5">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 tracking-wide">
          Loading Content
        </h3>
      </div>
    </div>
  );
}
