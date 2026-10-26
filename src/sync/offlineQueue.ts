// Offline queue for job edits made in the field: notes, photos, status changes.
// Edits are kept in memory and written to device storage every 30 seconds, then sent
// to the API when the device is back online.
import { storage } from "../platform/storage";
import { api } from "../platform/api";

export type JobEdit = {
  id: string;
  jobId: string;
  kind: "note" | "photo" | "status";
  payload: unknown;
  at: number;
};

const FLUSH_INTERVAL_MS = 30_000;
const KEY = "offline-queue";

export class OfflineQueue {
  private pending: JobEdit[] = [];
  private timer?: ReturnType<typeof setInterval>;

  start() {
    this.timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  add(edit: JobEdit) {
    this.pending.push(edit);
  }

  /** Write pending edits to device storage so they survive a restart. */
  async flush() {
    if (this.pending.length === 0) return;
    const saved = (await storage.get<JobEdit[]>(KEY)) ?? [];
    await storage.set(KEY, [...saved, ...this.pending]);
    this.pending = [];
  }

  /** Send stored edits to the API, oldest first. Called when connectivity returns. */
  async sync() {
    await this.flush();
    const saved = (await storage.get<JobEdit[]>(KEY)) ?? [];
    const left: JobEdit[] = [];
    for (const edit of saved) {
      try {
        await api.post(`/jobs/${edit.jobId}/edits`, edit);
      } catch {
        left.push(edit);
      }
    }
    await storage.set(KEY, left);
  }
}
