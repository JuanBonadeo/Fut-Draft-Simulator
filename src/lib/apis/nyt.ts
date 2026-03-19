import type { MonthlyDataPoint, TimeSeries } from "@/types/strata";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NytArticleSearchResponse {
  status: string;
  response?: {
    meta?: { hits: number };
  };
}

// ─── Single-year fetch ────────────────────────────────────────────────────────

/**
 * Fetch the total article count for a given year.
 * Uses begin_date/end_date + fl=_id so the payload is minimal;
 * the actual count comes from response.meta.hits.
 */
async function fetchNytYear(query: string, year: number, apiKey: string): Promise<number> {
  const url =
    `https://api.nytimes.com/svc/search/v2/articlesearch.json` +
    `?q=${encodeURIComponent(query)}` +
    `&begin_date=${year}0101` +
    `&end_date=${year}1231` +
    `&fl=_id` +
    `&api-key=${apiKey}`;

  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 429) throw new Error("NYT rate limited");
  if (!res.ok) throw new Error(`NYT ${res.status}`);

  const data = (await res.json()) as NytArticleSearchResponse;
  return data.response?.meta?.hits ?? 0;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

/**
 * Returns monthly article counts by distributing each year's total
 * uniformly across its months. NYT rate limit is 10 req/min, so we
 * add a small pause between requests (~11 total for 2015→today).
 */
export async function fetchNytMonthly(query: string, apiKey: string): Promise<TimeSeries> {
  const ID = "news" as const;
  const LABEL = "News Articles";

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const years = Array.from({ length: currentYear - 2015 + 1 }, (_, i) => 2015 + i);
    const points: MonthlyDataPoint[] = [];

    console.log(`[Explore3D][NYT] Fetching ${years.length} years`);

    for (const year of years) {
      try {
        const total = await fetchNytYear(query, year, apiKey);

        // 2015 starts from July; current year stops before the current (incomplete) month
        const startMonth = year === 2015 ? 7 : 1;
        const endMonth = year === currentYear ? currentMonth - 1 : 12;

        if (endMonth >= startMonth) {
          const perMonth = Math.round(total / (endMonth - startMonth + 1));
          for (let m = startMonth; m <= endMonth; m++) {
            points.push({ year, month: m, count: perMonth });
          }
        }

        console.log(`[Explore3D][NYT] ${year}: ${total} articles`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Explore3D][NYT] Failed ${year}:`, msg);
      }

      // Stay within the 10 req/min rate limit
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`[Explore3D][NYT] Complete: ${points.length} months`);
    return { id: ID, label: LABEL, available: points.some((p) => p.count > 0), data: points };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Explore3D][NYT] Error", msg);
    return { id: ID, label: LABEL, available: false, error: msg, data: [] };
  }
}
