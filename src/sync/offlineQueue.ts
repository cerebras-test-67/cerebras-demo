// Offline queue for job edits made in the field: notes, photos, status changes.
// Notes are written through to device storage as soon as they're added; other edits
// are batched and written every 30 seconds. Everything is flushed when the app goes to
// the background, because iOS can suspend and then kill a backgrounded app without
// warning. Edits are sent to the API when the device is back online.
import { AppState, type AppStateStatus } from "../platform/appState";
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
  private unsubscribe?: () => void;
  private writing: Promise<void> = Promise.resolve();

  start() {
    this.timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
    this.unsubscribe = AppState.subscribe((state: AppStateStatus) => {
      if (state === "background" || state === "inactive") void this.flush();
    });
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.unsubscribe?.();
  }

  async add(edit: JobEdit) {
    this.pending.push(edit);
    // Notes are small and they're what techs lose; don't leave them in memory.
    if (edit.kind === "note") await this.flush();
  }

  /** Write pending edits to device storage so they survive the app being killed. */
  flush() {
    // Serialize writes so a background flush can't interleave with a write-through.
    this.writing = this.writing.then(async () => {
      if (this.pending.length === 0) return;
      const batch = this.pending;
      this.pending = [];
      const saved = (await storage.get<JobEdit[]>(KEY)) ?? [];
      await storage.set(KEY, [...saved, ...batch]);
    });
    return this.writing;
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
