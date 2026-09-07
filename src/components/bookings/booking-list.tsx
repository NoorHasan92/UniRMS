"use client";

import { useState } from "react";
import { type Booking, type Resource, type Department } from "@prisma/client";
import { Plus, XCircle, CalendarDays, Clock, MapPin } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Dialog from "@/components/ui/dialog";
import EmptyState from "@/components/ui/empty-state";
import { createBooking, cancelBooking } from "@/app/actions/booking.actions";
import { formatTime12h, formatDateDisplay } from "@/lib/time-utils";

type FullBooking = Booking & {
  resource: Resource;
  department: Department | null;
  createdBy: { name: string; email: string } | null;
};

interface BookingListProps {
  initialBookings: FullBooking[];
  resources: Resource[];
  departments: Department[];
  currentUserId: string;
  isAdmin: boolean;
}

export default function BookingList({
  initialBookings,
  resources,
  departments,
  currentUserId,
  isAdmin
}: BookingListProps) {
  const [bookings, setBookings] = useState<FullBooking[]>(initialBookings);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [resourceId, setResourceId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState<string>("10:00");
  const [endTime, setEndTime] = useState<string>("12:00");
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [notes, setNotes] = useState("");

  function openCreateDialog() {
    setResourceId(resources[0]?.id || "");
    setDate(new Date().toISOString().split("T")[0]);
    setStartTime("10:00");
    setEndTime("12:00");
    setTitle("");
    setDepartmentId("");
    setNotes("");
    setError("");
    setIsDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = {
        resourceId,
        date,
        startTime,
        endTime,
        title: title.trim(),
        departmentId: departmentId || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await createBooking(data);

      if (!res.success) {
        setError(res.error || "An error occurred");
      } else {
        // Optimistic add (requires a full page reload for accurate relations, but we can fake it)
        window.location.reload(); 
        // using reload to get fresh data with populated relations like createdBy etc
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    
    try {
      const res = await cancelBooking(id);
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: "CANCELLED" } : b))
        );
      } else {
        alert(res.error || "Failed to cancel booking");
      }
    } catch (err) {
      alert("An unexpected error occurred");
    }
  }

  // Options
  const resourceOptions = resources.map((r) => ({ value: r.id, label: r.code + " - " + r.name }));
  const deptOptions = departments.map((d) => ({ value: d.id, label: d.code + " - " + d.name }));
  
  // Time Options (every 30 mins)
  const timeOptions = [];
  for (let h = 8; h <= 20; h++) {
    timeOptions.push({ value: `${String(h).padStart(2, "0")}:00`, label: formatTime12h(`${String(h).padStart(2, "0")}:00`) });
    timeOptions.push({ value: `${String(h).padStart(2, "0")}:30`, label: formatTime12h(`${String(h).padStart(2, "0")}:30`) });
  }

  return (
    <>
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Upcoming Bookings</h2>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="h-4 w-4" />
          New Booking
        </Button>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-12 w-12" />}
          title="No upcoming bookings"
          description="Schedule a room for a special event or ad-hoc class."
          action={
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-3 font-medium">Date & Time</th>
                <th className="px-6 py-3 font-medium">Event</th>
                <th className="px-6 py-3 font-medium">Location</th>
                <th className="px-6 py-3 font-medium">Organizer</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {bookings.map((booking) => (
                <tr key={booking.id} className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${booking.status === "CANCELLED" ? "opacity-50" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {formatDateDisplay(new Date(booking.date))}
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {formatTime12h(booking.startTime)} - {formatTime12h(booking.endTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{booking.title}</div>
                    {booking.department && (
                      <div className="text-xs text-zinc-500">{booking.department.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-blue-600">{booking.resource.code}</div>
                    <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {booking.resource.type.replace("_", " ")}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-zinc-900 dark:text-zinc-100">{booking.createdBy?.name || "Unknown"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      booking.status === "RESERVED" 
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" 
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {booking.status === "RESERVED" && (isAdmin || booking.createdById === currentUserId) && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Cancel Booking"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={isDialogOpen}
        onClose={() => !loading && setIsDialogOpen(false)}
        title="New Ad-hoc Booking"
        description="Reserve a room for a specific date and time"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">{error}</div>}
          
          <Input
            label="Event Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Guest Lecture, Faculty Meeting"
            required
            maxLength={200}
            disabled={loading}
          />

          <Select
            label="Resource (Room)"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            options={resourceOptions}
            required
            disabled={loading}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={loading}
            />
            <Select
              label="Department (Optional)"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={deptOptions}
              placeholder="-- Select --"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Start Time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              options={timeOptions}
              required
              disabled={loading}
            />
            <Select
              label="End Time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              options={timeOptions}
              required
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              placeholder="Any additional requirements..."
              disabled={loading}
              maxLength={500}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Reserve Room
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
