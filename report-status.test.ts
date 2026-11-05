import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NO_REPORT,
  REPORT_STATUS_UNAVAILABLE,
  SIGN_IN,
  formatReportStatus,
  statusForFailedReportCheck,
} from "./report-status.ts";

test("not loaded", () => {
  assert.equal(formatReportStatus({ loaded: false, count: 4 }), NO_REPORT);
  assert.equal(formatReportStatus({ count: 4 }), NO_REPORT);
});

test("string count with both dates", () => {
  assert.equal(
    formatReportStatus({
      loaded: true,
      count: "12",
      startDate: "2024-01-03",
      endDate: "2024-06-28",
      uploadedAt: null,
    }),
    "Report loaded: 12 transactions, 2024-01-03–2024-06-28",
  );
});

test("one date", () => {
  assert.equal(
    formatReportStatus({
      loaded: true,
      count: 1,
      startDate: "2024-01-03",
      endDate: null,
    }),
    "Report loaded: 1 transaction, 2024-01-03",
  );
});

test("both dates", () => {
  assert.equal(
    formatReportStatus({
      loaded: true,
      count: 128,
      startDate: "2024-01-03",
      endDate: "2024-06-28",
      uploadedAt: "2024-06-28T15:04:00.000Z",
    }),
    "Report loaded: 128 transactions, 2024-01-03–2024-06-28",
  );
});

test("malformed body", () => {
  assert.equal(formatReportStatus(null), NO_REPORT);
  assert.equal(formatReportStatus("loaded"), NO_REPORT);
  assert.equal(formatReportStatus({ loaded: true }), NO_REPORT);
  assert.equal(
    formatReportStatus({ loaded: true, count: 3, startDate: "March 1" }),
    "Report loaded: 3 transactions",
  );
});

test("failed report check after upload", () => {
  assert.equal(
    statusForFailedReportCheck(500, { count: 9 }),
    "Report loaded: 9 transactions",
  );
  assert.equal(
    statusForFailedReportCheck(null, {}),
    REPORT_STATUS_UNAVAILABLE,
  );
  assert.equal(statusForFailedReportCheck(401, { count: 9 }), SIGN_IN);
  assert.equal(statusForFailedReportCheck(500), NO_REPORT);
});
