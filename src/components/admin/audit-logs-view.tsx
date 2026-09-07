"use client";

import { format } from "date-fns";
import { 
  Database, User as UserIcon, Calendar as CalendarIcon, 
  MapPin, Shield, FileText, ChevronLeft, ChevronRight, Activity 
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuditLogsView({ 
  data, 
  currentEntityType 
}: { 
  data: {
    logs: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  currentEntityType?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "RESOURCE": return <MapPin className="h-4 w-4" />;
      case "USER": return <UserIcon className="h-4 w-4" />;
      case "SCHEDULE": 
      case "BOOKING": 
      case "MAINTENANCE_BLOCK": return <CalendarIcon className="h-4 w-4" />;
      case "TIMETABLE_IMPORT": return <FileText className="h-4 w-4" />;
      case "DEPARTMENT":
      case "PROGRAM":
      case "FACULTY":
      case "SUBJECT": return <Database className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE": return "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30";
      case "UPDATE": return "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30";
      case "DELETE": return "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/30";
      case "CANCEL": return "text-orange-700 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30";
      case "IMPORT": return "text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/30";
      default: return "text-zinc-700 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800";
    }
  };

  const handleFilter = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (type) {
      params.set('entityType', type);
    } else {
      params.delete('entityType');
    }
    params.delete('page'); // Reset page when filtering
    router.push(`?${params.toString()}`);
  };

  const handlePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const entityTypes = [
    "RESOURCE", "SCHEDULE", "BOOKING", "MAINTENANCE_BLOCK", 
    "TIMETABLE_IMPORT", "DEPARTMENT", "PROGRAM", "FACULTY", "SUBJECT", "USER"
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-sm font-medium text-zinc-500 mr-2 flex items-center gap-2">
            <FilterIcon /> Filter by:
          </span>
          <button
            onClick={() => handleFilter("")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !currentEntityType 
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" 
                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800"
            }`}
          >
            All Entities
          </button>
          {entityTypes.map(type => (
            <button
              key={type}
              onClick={() => handleFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                currentEntityType === type
                  ? "bg-emerald-600 text-white" 
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800"
              }`}
            >
              {type.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-6 py-3 font-medium">Timestamp</th>
              <th className="px-6 py-3 font-medium">Action</th>
              <th className="px-6 py-3 font-medium">Entity</th>
              <th className="px-6 py-3 font-medium">Details</th>
              <th className="px-6 py-3 font-medium">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
            {data.logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-zinc-300 dark:text-zinc-700" />
                  <p>No audit logs found.</p>
                </td>
              </tr>
            ) : (
              data.logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-500">
                    <div className="text-sm text-zinc-900 dark:text-zinc-100">{format(new Date(log.createdAt), "MMM d, yyyy")}</div>
                    <div className="text-xs">{format(new Date(log.createdAt), "HH:mm:ss")}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded text-xs font-semibold tracking-wide ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                      <span className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-500">
                        {getEntityIcon(log.entityType)}
                      </span>
                      {log.entityType}
                    </div>
                    {log.entityId && (
                      <div className="text-xs text-zinc-500 mt-1 font-mono">{log.entityId.slice(0, 8)}...</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {log.metadata ? (
                      <pre className="text-xs bg-zinc-50 dark:bg-zinc-950 p-2 rounded border border-zinc-100 dark:border-zinc-800 overflow-x-auto max-w-[300px]">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-zinc-400 italic">No metadata</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-500">
                    {log.user ? (
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{log.user.name}</div>
                        <div className="text-xs">{log.user.email}</div>
                      </div>
                    ) : (
                      <span className="italic">System</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Showing <span className="font-medium text-zinc-900 dark:text-zinc-100">{(data.page - 1) * data.pageSize + 1}</span> to{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{Math.min(data.page * data.pageSize, data.total)}</span> of{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{data.total}</span> entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePage(data.page - 1)}
              disabled={data.page === 1}
              className="p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-600 disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePage(data.page + 1)}
              disabled={data.page === data.totalPages}
              className="p-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-600 disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
  );
}
