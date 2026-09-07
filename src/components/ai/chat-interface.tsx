"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Sparkles, AlertCircle } from "lucide-react";
import Button from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "model";
  content: string;
}

export default function ChatInterface({ userName }: { userName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: "Hello! I'm your UniRMS AI assistant. I can help you find available rooms, check resource utilization, or answer questions about the current timetable. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "model", content: data.content }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "model", content: "Sorry, I encountered an error while processing your request. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              }`}
            >
              {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              }`}
            >
              <div className="prose prose-sm dark:prose-invert prose-zinc max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-5 py-3.5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about resources, availability, or schedules..."
            className="w-full pl-4 pr-12 py-3 bg-zinc-100 dark:bg-zinc-800 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-blue-500/20 rounded-xl outline-none text-zinc-900 dark:text-zinc-100 transition-all text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 text-zinc-400 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-zinc-400 transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Powered by Gemini 2.5 Pro. Responses are based on live database information.</span>
        </div>
      </div>
    </>
  );
}
