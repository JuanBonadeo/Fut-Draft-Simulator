import type { DataPoint, RawYearCount } from "@/types/strata";

export function normalizeData(data: RawYearCount[]): DataPoint[] {
  const sorted = [...data].sort((a, b) => a.year - b.year);
  const maxCount = Math.max(...sorted.map((d) => d.count), 1);

  return sorted.map((d) => ({
    year: d.year,
    count: d.count,
    normalized: Math.round((d.count / maxCount) * 100),
  }));
}

export function calculateTotalCount(data: RawYearCount[]): number {
  return data.reduce((sum, item) => sum + item.count, 0);
}

export function calculatePeakYear(data: RawYearCount[]): number {
  if (data.length === 0) {
    return 0;
  }

  return data.reduce((max, item) => (item.count > max.count ? item : max)).year;
}
