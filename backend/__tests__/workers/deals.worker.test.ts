/**
 * Tests for the deals worker processor logic.
 * Captures the BullMQ processor function without spinning up Redis.
 * Mocks prisma, itad helpers, sentry, and logger.
 */

// ── Prisma mock ──────────────────────────────────────────────────────────────
const mockGameFindMany = jest.fn();
const mockSnapshotCreateMany = jest.fn();
const mockSnapshotDeleteMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    game: {
      findMany: (...args: unknown[]) => mockGameFindMany(...args),
    },
    priceSnapshot: {
      createMany: (...args: unknown[]) => mockSnapshotCreateMany(...args),
      deleteMany: (...args: unknown[]) => mockSnapshotDeleteMany(...args),
    },
  },
}));

// ── ITAD helpers mock ─────────────────────────────────────────────────────────
const mockResolveItadId = jest.fn();
const mockGetPrices = jest.fn();
jest.mock("@/lib/itad", () => ({
  resolveItadId: (...args: unknown[]) => mockResolveItadId(...args),
  getPrices: (...args: unknown[]) => mockGetPrices(...args),
}));

// ── BullMQ mock — capture processor, no real Redis ───────────────────────────
type ProcessorFn = (job: { id?: string; data: Record<string, unknown> }) => Promise<void>;
let capturedProcessor: ProcessorFn | null = null;

jest.mock("@/lib/bullmq", () => {
  class MockWorker {
    constructor(_queue: string, processor: ProcessorFn, _opts: unknown) {
      capturedProcessor = processor;
    }
    on(_event: string, _cb: unknown) { return this; }
    close() { return Promise.resolve(); }
  }
  const mockDealsQueue = { add: jest.fn().mockResolvedValue({}) };
  return {
    Worker: MockWorker,
    Queue: class { add() { return Promise.resolve({}); } },
    connection: {},
    dealsQueue: mockDealsQueue,
  };
});

// ── Sentry / logger mocks ─────────────────────────────────────────────────────
jest.mock("@/lib/sentry", () => ({ captureError: jest.fn() }));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Import worker to register capturedProcessor as side-effect ────────────────
import "@/workers/deals.worker";

// ── Mock job helper ───────────────────────────────────────────────────────────
function makeJob() {
  return { id: "job-1", data: { trigger: "poll" } };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("Deals worker processor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: cleanup always succeeds
    mockSnapshotDeleteMany.mockResolvedValue({ count: 0 });
  });

  it("has a registered processor function", () => {
    expect(capturedProcessor).not.toBeNull();
  });

  it("handles null from resolveItadId gracefully (simulates no ITAD_API_KEY)", async () => {
    // One game in DB, but ITAD lookup returns null → no snapshots written
    mockGameFindMany.mockResolvedValueOnce([
      { id: "game-1", steamAppId: "12345", title: "Game 1" },
    ]);
    mockResolveItadId.mockResolvedValue(null);

    await expect(capturedProcessor!(makeJob())).resolves.not.toThrow();

    expect(mockSnapshotCreateMany).not.toHaveBeenCalled();
  });

  it("resolves games with no steamAppId via title fallback", async () => {
    // Epic-exclusive title with no Steam release — should still resolve via title search
    mockGameFindMany.mockResolvedValueOnce([
      { id: "game-2", steamAppId: null, title: "Alan Wake II" },
    ]);
    mockResolveItadId.mockResolvedValue("itad-2");
    mockGetPrices.mockResolvedValue([
      { gameId: "itad-2", shop: "Epic", price: 49.99, cut: 0, url: "https://store.epicgames.com/alan-wake-2" },
    ]);
    mockSnapshotCreateMany.mockResolvedValue({ count: 1 });

    await capturedProcessor!(makeJob());

    expect(mockResolveItadId).toHaveBeenCalledWith("game-2", null, "Alan Wake II");
    expect(mockSnapshotCreateMany).toHaveBeenCalledTimes(1);
  });

  it("skips snapshot write when getPrices returns empty array (non-OK ITAD response)", async () => {
    mockGameFindMany.mockResolvedValueOnce([
      { id: "game-1", steamAppId: "12345", title: "Game 1" },
    ]);
    mockResolveItadId.mockResolvedValue("itad-1");
    mockGetPrices.mockResolvedValue([]); // ITAD returned non-OK → empty

    await capturedProcessor!(makeJob());

    expect(mockSnapshotCreateMany).not.toHaveBeenCalled();
  });

  it("bulk writes price snapshots when getPrices returns results", async () => {
    mockGameFindMany.mockResolvedValueOnce([
      { id: "game-1", steamAppId: "12345", title: "Game 1" },
    ]);
    mockResolveItadId.mockResolvedValue("itad-1");
    mockGetPrices.mockResolvedValue([
      { gameId: "itad-1", shop: "Steam", price: 9.99, cut: 50, url: "https://store.steampowered.com/app/12345" },
    ]);
    mockSnapshotCreateMany.mockResolvedValue({ count: 1 });

    await capturedProcessor!(makeJob());

    expect(mockSnapshotCreateMany).toHaveBeenCalledTimes(1);
    expect(mockSnapshotCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({ gameId: "game-1", shop: "Steam", priceINR: 9.99 }),
        ],
      })
    );
  });

  it("cleans up price snapshots older than the retention window", async () => {
    mockGameFindMany.mockResolvedValueOnce([]);
    mockSnapshotDeleteMany.mockResolvedValue({ count: 5 });

    await capturedProcessor!(makeJob());

    expect(mockSnapshotDeleteMany).toHaveBeenCalledTimes(1);
  });
});
