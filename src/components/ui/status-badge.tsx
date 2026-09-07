import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";

interface BadgeProps {
  status: string;
  size?: "sm" | "md";
  showDot?: boolean;
}

export default function StatusBadge({ status, size = "sm", showDot = true }: BadgeProps) {
  const colors = STATUS_COLORS[status] ?? {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    dot: "bg-zinc-400",
  };
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ");

  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${colors.bg} ${colors.text} ${sizeClasses}`}>
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      )}
      {label}
    </span>
  );
}
