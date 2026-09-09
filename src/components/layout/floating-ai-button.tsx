"use client";

import Link from "next/link";
import { Sparkles, MessageSquareText } from "lucide-react";
import { motion } from "framer-motion";

export default function FloatingAIButton() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed bottom-6 right-6 z-40"
    >
      <Link
        href="/ai"
        className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-full shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 border border-white/20 transition-all duration-300 backdrop-blur-md"
        aria-label="Ask AI Assistant"
      >
        {/* Glow ambient ring */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-40 blur transition duration-300" />

        {/* Pulsing indicator dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>

        {/* Icon with smooth rotate on hover */}
        <div className="relative flex items-center justify-center">
          <MessageSquareText className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
          <Sparkles className="h-2.5 w-2.5 absolute -top-1 -right-1 text-amber-300 animate-pulse" />
        </div>

        {/* Label */}
        <span className="relative text-sm font-semibold tracking-wide pr-1">
          Ask AI
          <span className="hidden sm:inline text-blue-100 font-normal ml-1">Assistant</span>
        </span>
      </Link>
    </motion.div>
  );
}
