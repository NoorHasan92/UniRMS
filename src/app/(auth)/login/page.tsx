"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GraduationCap, Eye, EyeOff, AlertCircle } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] mx-4">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-600/20">
          <GraduationCap className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">UniRMS</h1>
        <p className="text-sm text-zinc-500 mt-1">University Resource Management System</p>
      </div>

      {/* Login Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50 p-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Sign in</h2>
        <p className="text-sm text-zinc-500 mb-6">Enter your credentials to access the system</p>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@university.edu"
            required
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-[34px] text-zinc-400 hover:text-zinc-600 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            Sign In
          </Button>
        </form>
      </div>

      {/* Help text */}
      <p className="text-center text-xs text-zinc-400 mt-6">
        Contact your administrator for access credentials
      </p>
    </div>
  );
}
