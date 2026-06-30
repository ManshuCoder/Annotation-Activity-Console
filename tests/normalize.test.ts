import { normalizeTask, normalizeStatus, normalizeAnnotationCount, normalizeTimestamp } from "../src/utils/normalize";
import { TaskStatus } from "../src/types";

describe("Data Normalization Layer", () => {
  describe("normalizeStatus", () => {
    it("should normalize status casings and spellings correctly", () => {
      expect(normalizeStatus("in_progress")).toBe(TaskStatus.IN_PROGRESS);
      expect(normalizeStatus("InProgress")).toBe(TaskStatus.IN_PROGRESS);
      expect(normalizeStatus("IN-PROGRESS")).toBe(TaskStatus.IN_PROGRESS);
      expect(normalizeStatus("todo")).toBe(TaskStatus.TODO);
      expect(normalizeStatus("QA")).toBe(TaskStatus.QA);
      expect(normalizeStatus("done")).toBe(TaskStatus.DONE);
      expect(normalizeStatus("BLOCKED")).toBe(TaskStatus.BLOCKED);
    });

    it("should fallback to UNKNOWN for unsupported statuses", () => {
      expect(normalizeStatus(null)).toBe(TaskStatus.UNKNOWN);
      expect(normalizeStatus(undefined)).toBe(TaskStatus.UNKNOWN);
      expect(normalizeStatus("waiting_review")).toBe(TaskStatus.UNKNOWN);
    });
  });

  describe("normalizeAnnotationCount", () => {
    it("should parse valid numbers", () => {
      expect(normalizeAnnotationCount(12)).toBe(12);
      expect(normalizeAnnotationCount(0)).toBe(0);
    });

    it("should parse numbers represented as strings", () => {
      expect(normalizeAnnotationCount("45")).toBe(45);
      expect(normalizeAnnotationCount("0")).toBe(0);
      expect(normalizeAnnotationCount("invalid")).toBe(0);
    });

    it("should fallback to 0 for invalid values", () => {
      expect(normalizeAnnotationCount(null)).toBe(0);
      expect(normalizeAnnotationCount(undefined)).toBe(0);
      expect(normalizeAnnotationCount(NaN)).toBe(0);
    });
  });

  describe("normalizeTimestamp", () => {
    it("should pass through valid millisecond epoch numbers", () => {
      const ms = 1719600000000;
      expect(normalizeTimestamp(ms)).toBe(ms);
    });

    it("should convert epoch seconds to milliseconds", () => {
      const seconds = 1719600000;
      expect(normalizeTimestamp(seconds)).toBe(seconds * 1000);
    });

    it("should parse ISO date strings into milliseconds", () => {
      const iso = "2026-06-30T10:00:00.000Z";
      const expected = Date.parse(iso);
      expect(normalizeTimestamp(iso)).toBe(expected);
    });

    it("should fallback to current date for invalid formats", () => {
      const before = Date.now();
      const parsed = normalizeTimestamp("bad-date-string");
      const after = Date.now();
      expect(parsed).toBeGreaterThanOrEqual(before);
      expect(parsed).toBeLessThanOrEqual(after);
    });
  });

  describe("normalizeTask", () => {
    it("should construct a valid Task union from messy object structure", () => {
      const rawPayload = {
        id: "t42",
        title: "Task 42",
        type: "image",
        status: "InProgress",
        assignee: { id: "u1", name: "Asha" },
        annotationCount: "99",
        updatedAt: "2026-06-30T10:00:00.000Z",
        meta: { priority: "high" },
      };

      const normalized = normalizeTask(rawPayload);

      expect(normalized).toEqual({
        id: "t42",
        title: "Task 42",
        type: "image",
        status: TaskStatus.IN_PROGRESS,
        assignee: { id: "u1", name: "Asha" },
        annotationCount: 99,
        updatedAt: Date.parse("2026-06-30T10:00:00.000Z"),
        meta: { priority: "high" },
      });
    });

    it("should fallback to unknown task details for empty objects", () => {
      const normalized = normalizeTask({});
      expect(normalized.id).toBe("unknown");
      expect(normalized.title).toBe("Task unknown");
      expect(normalized.type).toBe("unknown");
      expect(normalized.status).toBe(TaskStatus.UNKNOWN);
      expect(normalized.assignee).toBeNull();
    });
  });
});
