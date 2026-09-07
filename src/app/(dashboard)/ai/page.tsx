import ChatInterface from "@/components/ai/chat-interface";
import { requireAuth } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function AIPage() {
  const session = await requireAuth();

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      <div className="flex flex-col mb-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">AI Assistant</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Ask questions about resource availability, utilization, and scheduling in natural language.
        </p>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
        <ChatInterface userName={session.user?.name || "User"} />
      </div>
    </div>
  );
}
