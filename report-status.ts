export const NO_REPORT = "No report loaded";
export const SIGN_IN = "Sign in again to see your report";
export const REPORT_STATUS_UNAVAILABLE = "Report status unavailable";

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function readCount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function readDay(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
}

// GET /api/report: { loaded, count, startDate, endDate, uploadedAt }.
// Null or missing dates are left off the status line.
export function formatReportStatus(body: unknown): string {
  const record = asRecord(body);
  if (!record || record.loaded !== true) return NO_REPORT;

  const count = readCount(record.count);
  if (count === undefined) return NO_REPORT;

  const start = readDay(record.startDate);
  const end = readDay(record.endDate);
  const noun = count === 1 ? "transaction" : "transactions";
  if (start && end) return `Report loaded: ${count} ${noun}, ${start}–${end}`;
  if (start || end) return `Report loaded: ${count} ${noun}, ${start || end}`;
  return `Report loaded: ${count} ${noun}`;
}

export function statusFromUploadCount(body: unknown): string | undefined {
  const count = readCount(asRecord(body)?.count);
  if (count === undefined) return undefined;
  const noun = count === 1 ? "transaction" : "transactions";
  return `Report loaded: ${count} ${noun}`;
}

// A failed follow-up after a successful upload passes uploadBody so the header
// can use that count. A 401 asks the user to sign in instead.
export function statusForFailedReportCheck(
  httpStatus: number | null,
  uploadBody?: unknown,
): string {
  if (httpStatus === 401) return SIGN_IN;
  if (uploadBody !== undefined) {
    return statusFromUploadCount(uploadBody) ?? REPORT_STATUS_UNAVAILABLE;
  }
  return NO_REPORT;
}
