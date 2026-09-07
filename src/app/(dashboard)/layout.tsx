import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

import PageTransition from "@/components/layout/page-transition";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="h-screen bg-sidebar flex overflow-hidden">
      <Sidebar userRole={(session.user as { role?: string }).role} />
      <div className="flex-1 lg:ml-[260px] flex flex-col h-screen lg:py-4 lg:pr-4">
        <div className="flex-1 flex flex-col bg-white lg:rounded-[2.5rem] lg:shadow-md lg:border lg:border-border lg:overflow-hidden relative">
          <Header
            user={{
              name: session.user.name,
              email: session.user.email,
              role: (session.user as { role?: string }).role,
            }}
          />
          <main className="flex-1 p-6 lg:p-8 flex flex-col relative z-0 overflow-y-auto">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </div>
      </div>
    </div>
  );
}
