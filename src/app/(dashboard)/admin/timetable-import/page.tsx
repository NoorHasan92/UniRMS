import { redirect } from "next/navigation";

export default function TimetableImportLegacyRedirect() {
  redirect("/admin/timetables");
}
