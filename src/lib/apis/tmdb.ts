import type { MonthlyDataPoint, TimeSeries } from "@/types/strata";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve TMDB keyword IDs for a query string (returns up to 3). */
async function resolveTmdbKeywordIds(query: string, apiKey: string): Promise<number[]> {
  const url =
    `https://api.themoviedb.org/3/search/keyword` +
    `?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: { id: number }[] };
    return (data.results ?? []).slice(0, 3).map((k) => k.id);
  } catch {
    return [];
  }
}

function parseReleaseDate(rd: string | undefined): { year: number; month: number } | null {
  if (!rd) return null;
  const year = Number(rd.slice(0, 4));
  const month = Number(rd.slice(5, 7));
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
}

function addToMap(map: Map<string, number>, year: number, month: number): void {
  const key = `${year}-${month}`;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function mapToSortedPoints(map: Map<string, number>): MonthlyDataPoint[] {
  return [...map.entries()]
    .map(([key, count]) => {
      const [y, m] = key.split("-");
      return { year: Number(y), month: Number(m), count };
    })
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
}

// ─── Strategy A: keyword-based discovery ─────────────────────────────────────

async function discoverByKeywords(
  keywordIds: number[],
  apiKey: string,
  map: Map<string, number>,
): Promise<void> {
  const withKeywords = keywordIds.join("|"); // "|" = OR in TMDB discover
  for (let page = 1; page <= 10; page++) {
    const url =
      `https://api.themoviedb.org/3/discover/movie` +
      `?api_key=${apiKey}` +
      `&with_keywords=${withKeywords}` +
      `&primary_release_date.gte=2015-07-01` +
      `&sort_by=primary_release_date.asc` +
      `&page=${page}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) break;

    const data = (await res.json()) as {
      results?: { release_date?: string }[];
      total_pages?: number;
    };
    const results = data.results ?? [];
    if (results.length === 0) break;

    for (const movie of results) {
      const parsed = parseReleaseDate(movie.release_date);
      if (parsed) addToMap(map, parsed.year, parsed.month);
    }

    if (page >= (data.total_pages ?? 1)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
}

// ─── Strategy B: title search fallback ───────────────────────────────────────

async function searchByTitle(
  query: string,
  apiKey: string,
  map: Map<string, number>,
): Promise<void> {
  for (let page = 1; page <= 5; page++) {
    const url =
      `https://api.themoviedb.org/3/search/movie` +
      `?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${page}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) break;

    const data = (await res.json()) as { results?: { release_date?: string }[] };
    const results = data.results ?? [];
    if (results.length === 0) break;

    for (const movie of results) {
      const parsed = parseReleaseDate(movie.release_date);
      if (!parsed || parsed.year < 2015) continue;
      addToMap(map, parsed.year, parsed.month);
    }

    if (results.length < 20) break;
    await new Promise((r) => setTimeout(r, 200));
  }
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

export async function fetchTmdbMonthly(query: string): Promise<TimeSeries> {
  const ID = "movies" as const;
  const LABEL = "Films & Series";

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return { id: ID, label: LABEL, available: false, error: "TMDB_API_KEY not configured", data: [] };
  }

  try {
    const keywordIds = await resolveTmdbKeywordIds(query, apiKey);
    console.log("[Explore3D][TMDB] Keyword IDs", { query, keywordIds });

    const monthlyMap = new Map<string, number>();

    if (keywordIds.length > 0) {
      await discoverByKeywords(keywordIds, apiKey, monthlyMap);
    } else {
      await searchByTitle(query, apiKey, monthlyMap);
    }

    const data = mapToSortedPoints(monthlyMap);
    console.log("[Explore3D][TMDB] Done", { points: data.length, keywordIds });
    return { id: ID, label: LABEL, available: data.length > 0, data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Explore3D][TMDB] Error", msg);
    return { id: ID, label: LABEL, available: false, error: msg, data: [] };
  }
}
