"use client";

import { useState } from "react";
import { type Department } from "@prisma/client";
import { Search, Clock, Users, Building, Filter, MapPin } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import StatusBadge from "@/components/ui/status-badge";
import { searchAvailability } from "@/app/actions/search.actions";
import { DAY_FULL_LABELS, BLOCK_LABELS } from "@/lib/constants";
import { formatTime12h, getDayOfWeek } from "@/lib/time-utils";

interface AvailabilitySearchProps {
  departments: Department[];
}

export default function AvailabilitySearch({ departments }: AvailabilitySearchProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  // Filters
  const [searchMode, setSearchMode] = useState<"CONTINUOUS" | "STATUS">("CONTINUOUS");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [minDuration, setMinDuration] = useState<number>(60);
  const [minCapacity, setMinCapacity] = useState<number>(1);
  const [resourceType, setResourceType] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [block, setBlock] = useState<string>("");
  const [floor, setFloor] = useState<string>("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const dayOfWeek = getDayOfWeek(new Date(date));
      const res = await searchAvailability({
        date,
        dayOfWeek: dayOfWeek as any,
        minContinuousFreeMinutes: searchMode === "CONTINUOUS" ? minDuration : undefined,
        minCapacity: minCapacity > 1 ? minCapacity : undefined,
        resourceType: (resourceType as any) || undefined,
        departmentId: departmentId || undefined,
        block: (block as any) || undefined,
        floor: floor ? Number(floor) : undefined,
      });

      setResults(res);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch availability");
    } finally {
      setLoading(false);
    }
  }

  // Options
  const deptOptions = departments.map(d => ({ value: d.id, label: d.code }));
  const typeOptions = [
    { value: "CLASSROOM", label: "Classroom" },
    { value: "LAB", label: "Laboratory" },
    { value: "SEMINAR_HALL", label: "Seminar Hall" },
    { value: "AUDITORIUM", label: "Auditorium" },
    { value: "CONFERENCE_ROOM", label: "Conference Room" },
  ];
  const blockOptions = [
    { value: "LEFT", label: "Left Block" },
    { value: "RIGHT", label: "Right Block" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Filters Sidebar */}
      <div className="lg:col-span-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 sticky top-20">
        <div className="flex items-center gap-2 mb-4 text-zinc-900 dark:text-zinc-100 font-medium pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <Filter className="h-5 w-5" />
          <h2>Search Criteria</h2>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            <button
              type="button"
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${searchMode === "CONTINUOUS" ? "bg-white dark:bg-zinc-700 shadow text-blue-600 dark:text-blue-400" : "text-zinc-500"}`}
              onClick={() => setSearchMode("CONTINUOUS")}
            >
              Find Slots
            </button>
            <button
              type="button"
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${searchMode === "STATUS" ? "bg-white dark:bg-zinc-700 shadow text-blue-600 dark:text-blue-400" : "text-zinc-500"}`}
              onClick={() => setSearchMode("STATUS")}
            >
              Daily Status
            </button>
          </div>

          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          {searchMode === "CONTINUOUS" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex justify-between">
                <span>Required Duration</span>
                <span className="text-blue-600 font-semibold">{minDuration} mins</span>
              </label>
              <input
                type="range"
                min="30"
                max="240"
                step="30"
                value={minDuration}
                onChange={(e) => setMinDuration(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          )}

          <Input
            label="Minimum Capacity"
            type="number"
            min="1"
            value={minCapacity}
            onChange={(e) => setMinCapacity(Number(e.target.value))}
          />

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Location & Type</p>
            
            <Select
              label="Resource Type"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              options={typeOptions}
              placeholder="Any Type"
            />
            
            <Select
              label="Department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={deptOptions}
              placeholder="Any Department"
            />
            
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Block"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                options={blockOptions}
                placeholder="Any"
              />
              <Input
                label="Floor"
                type="number"
                min="1"
                max="8"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="Any"
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-2">
            <Search className="h-4 w-4" />
            Search Availability
          </Button>
        </form>
      </div>

      {/* Results Area */}
      <div className="lg:col-span-3">
        {results === null ? (
          <div className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="text-center text-zinc-500">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>Configure filters and search to find available resources.</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="h-full min-h-[400px] flex items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
            <div className="text-center text-zinc-500">
              <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No resources found</p>
              <p className="mt-1">Try relaxing your search criteria.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-500">
                Found {results.length} matching resource{results.length !== 1 ? 's' : ''}
              </h3>
            </div>

            <div className="grid gap-4">
              {results.map((r, i) => (
                <div key={r.resourceId} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    
                    {/* Resource Info */}
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{r.resourceCode}</h4>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="text-sm text-zinc-500 mb-3">{r.resourceName}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {BLOCK_LABELS[r.block]} • Floor {r.floor}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          Capacity: {r.capacity}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5" />
                          {r.departmentCode || "Common"}
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex flex-col gap-1.5 min-w-[140px] text-right bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <div className="text-xs text-zinc-500">Utilization</div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{r.utilizationPercent}%</div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1 mt-1">
                        <div
                          className={`h-1 rounded-full ${r.utilizationPercent > 80 ? 'bg-red-500' : r.utilizationPercent > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(r.utilizationPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Matching Slots or Timeline */}
                  <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    {searchMode === "CONTINUOUS" && r.matchingSlots ? (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wider">Available Slots ({minDuration}+ mins)</p>
                        <div className="flex flex-wrap gap-2">
                          {r.matchingSlots.map((slot: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-sm">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">{formatTime12h(slot.start)} - {formatTime12h(slot.end)}</span>
                              <span className="text-xs opacity-75">({slot.durationMinutes}m)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wider">Free Intervals Today</p>
                        <div className="flex flex-wrap gap-2">
                          {r.freeIntervals.length === 0 ? (
                            <span className="text-sm text-zinc-500">Fully booked</span>
                          ) : (
                            r.freeIntervals.map((slot: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-400 px-3 py-1.5 rounded-lg text-sm">
                                <Clock className="h-4 w-4" />
                                <span>{formatTime12h(slot.start)} - {formatTime12h(slot.end)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
