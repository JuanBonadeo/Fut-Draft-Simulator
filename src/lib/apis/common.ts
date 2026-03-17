import type { RawYearCount, SourceId, SourceResult } from "@/types/strata";
import {
  calculatePeakYear,
  calculateTotalCount,
  normalizeData,
} from "@/lib/apis/normalize";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sanitizeYearRange(
  yearStart?: number,
  yearEnd?: number,
): { start: number; end: number } {
  const currentYear = new Date().getFullYear();
  const parsedStart = Number.isFinite(yearStart) ? Number(yearStart) : 1990;
  const parsedEnd = Number.isFinite(yearEnd) ? Number(yearEnd) : currentYear;

  const safeStart = Math.max(1900, Math.min(parsedStart, currentYear));
  const safeEnd = Math.max(1900, Math.min(parsedEnd, currentYear));

  if (safeStart <= safeEnd) {
    return { start: safeStart, end: safeEnd };
  }

  return { start: safeEnd, end: safeStart };
}

export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

export function toErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return error instanceof Error ? error.message : "Unknown error";
}

export function buildSourceResult(
  source: SourceId,
  label: string,
  description: string,
  rawData: RawYearCount[],
): SourceResult {
  const normalizedData = normalizeData(rawData);

  return {
    source,
    label,
    description,
    data: normalizedData,
    totalCount: calculateTotalCount(rawData),
    peakYear: calculatePeakYear(rawData),
    available: normalizedData.length > 0,
    ...(normalizedData.length === 0 ? { error: "No data available" } : {}),
  };
}

export function buildUnavailableSourceResult(
  source: SourceId,
  label: string,
  description: string,
  error: unknown,
): SourceResult {
  return {
    source,
    label,
    description,
    data: [],
    totalCount: 0,
    peakYear: 0,
    available: false,
    error: toErrorMessage(error),
  };
}
