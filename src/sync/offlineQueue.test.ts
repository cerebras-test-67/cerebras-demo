import { describe, expect, it, vi } from "vitest";
import { OfflineQueue } from "./offlineQueue";
import { storage } from "../platform/storage";
import { AppState } from "../platform/appState";

vi.mock("../platform/storage");
vi.mock("../platform/appState");

const note = (id: string) => ({ id, jobId: "job-1", kind: "note" as const, payload: { text: "replaced anode rod" }, at: Date.now() });

describe("OfflineQueue", () => {
  it("writes notes to storage immediately", async () => {
    const q = new OfflineQueue();
    await q.add(note("n1"));
    expect(storage.set).toHaveBeenCalledWith("offline-queue", [expect.objectContaining({ id: "n1" })]);
  });

  it("flushes everything when the app goes to the background", async () => {
    const q = new OfflineQueue();
    q.start();
    await q.add({ ...note("s1"), kind: "status" });
    vi.mocked(AppState).emit("background");
    await q.flush();
    expect(storage.set).toHaveBeenLastCalledWith("offline-queue", expect.arrayContaining([expect.objectContaining({ id: "s1" })]));
    q.stop();
  });
});
