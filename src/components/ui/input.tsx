"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-zinc-300 dark:border-zinc-600"
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {helpText && !error && <p className="text-xs text-zinc-500">{helpText}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
