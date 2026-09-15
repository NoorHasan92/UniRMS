import { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-utils";
import { getTimetableById } from "@/lib/services/timetable.service";
import TimetableDetailView from "@/components/admin/timetable-detail-view";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const timetable = await getTimetableById(id);

  return {
    title: timetable ? `${timetable.name} | UniRMS Admin` : "Timetable Details | UniRMS Admin",
    description: "Inspect schedules, classrooms, and faculty allocations for this timetable.",
  };
}

export default async function AdminTimetableDetailPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const timetable = await getTimetableById(id);
  if (!timetable) {
    notFound();
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <TimetableDetailView timetable={timetable as any} />
    </div>
  );
}
