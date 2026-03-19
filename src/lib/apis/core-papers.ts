import type { MonthlyDataPoint } from "@/types/strata";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoreSearchResponse {
  totalHits: number;
  limit: number;
  offset: number;
  results: unknown[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Spread a yearly total uniformly across a range of months. */
function spreadAcrossMonths(
  year: number,
  total: number,
  startMonth: number,
  endMonth: number,
): MonthlyDataPoint[] {
  const count = endMonth - startMonth + 1;
  const perMonth = count > 0 ? Math.round(total / count) : 0;
  return Array.from({ length: count }, (_, i) => ({
    year,
    month: startMonth + i,
    count: perMonth,
  }));
}

// ─── Per-year fetcher ─────────────────────────────────────────────────────────

async function fetchCoreYear(
  query: string,
  year: number,
  apiKey: string,
): Promise<number> {
  const response = await fetch("https://api.core.ac.uk/v3/search/works", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, yearFrom: year, yearTo: year, limit: 1, offset: 0 }),
    cache: "no-store",
  });

  if (response.status === 429) throw new Error("CORE rate limited");
  if (!response.ok) throw new Error(`CORE ${response.status}`);

  const data = (await response.json()) as CoreSearchResponse;
  return data.totalHits ?? 0;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchCoreMonthly(
  query: string,
  apiKey: string,
): Promise<MonthlyDataPoint[]> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Build the list of years to fetch: 2015 → current year
  const years = Array.from({ length: currentYear - 2015 + 1 }, (_, i) => 2015 + i);

  console.log(`[Papers][CORE] Fetching ${years.length} years`);

  const results: MonthlyDataPoint[] = [];

  for (const year of years) {
    try {
      const total = await fetchCoreYear(query, year, apiKey);

      // 2015 starts in July; current year ends in the last completed month
      const startMonth = year === 2015 ? 7 : 1;
      const endMonth = year === currentYear ? currentMonth - 1 : 12;

      if (endMonth >= startMonth) {
        results.push(...spreadAcrossMonths(year, total, startMonth, endMonth));
      }

      console.log(`[Papers][CORE] ${year}: ${total} papers`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Papers][CORE] Failed ${year}:`, msg);
    }

    // Small pause between requests
    if (year < currentYear) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`[Papers][CORE] Complete: ${results.length} months`);
  return results;
}
