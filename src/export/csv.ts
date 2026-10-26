// CSV export of a company's jobs for a date range.
import { db } from "../platform/db";

const COLUMNS = ["job_id", "scheduled_at", "customer", "address", "technician", "status", "total"];

function escape(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportJobsCsv(companyId: string, from: Date, to: Date): Promise<string> {
  const jobs = await db.jobs.findMany({ where: { companyId, scheduledAt: { gte: from, lte: to } } });
  const lines = [COLUMNS.join(",")];
  for (const job of jobs) {
    // One query per row; slow for big accounts (see the >10k jobs timeout issue).
    const tech = job.technicianId ? await db.technicians.findById(job.technicianId) : undefined;
    lines.push(
      [job.id, job.scheduledAt.toISOString(), job.customerName, job.address, tech?.name ?? "", job.status, job.total]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}
