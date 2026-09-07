interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-4 text-zinc-300 dark:text-zinc-600">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
