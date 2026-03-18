import { buildSourceResult, buildUnavailableSourceResult } from "@/lib/apis/common";
import type { RawYearCount, SourceResult } from "@/types/strata";

const SOURCE_ID = "tmdb" as const;
const LABEL = "Film & TV";
const DESCRIPTION = "Movies and series mentioning this concept per year (TMDB)";

interface TmdbMovie {
  release_date?: string; // "YYYY-MM-DD" or ""
}

interface TmdbPage {
  results: TmdbMovie[];
  total_pages: number;
}

export async function fetchTmdb(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<SourceResult> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return buildUnavailableSourceResult(SOURCE_ID, LABEL, DESCRIPTION, "TMDB_API_KEY not configured");
  }

  try {
    const MAX_PAGES = 10;

    const firstUrl =
      `https://api.themoviedb.org/3/search/movie` +
      `?query=${encodeURIComponent(query)}&api_key=${apiKey}&page=1`;

    console.log("[TMDB] Fetching page 1", { query });

    const firstRes = await fetch(firstUrl, { cache: "no-store" });
    if (!firstRes.ok) {
      throw new Error(`TMDB request failed: ${firstRes.status} ${firstRes.statusText}`);
    }
    const firstData = (await firstRes.json()) as TmdbPage;

    const totalPages = Math.min(firstData.total_pages ?? 1, MAX_PAGES);

    // Fetch remaining pages in parallel
    const remainingPages =
      totalPages > 1
        ? await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) => i + 2).map(async (page) => {
              const url =
                `https://api.themoviedb.org/3/search/movie` +
                `?query=${encodeURIComponent(query)}&api_key=${apiKey}&page=${page}`;
              const res = await fetch(url, { cache: "no-store" });
              if (!res.ok) return { results: [], total_pages: 0 } as TmdbPage;
              return (await res.json()) as TmdbPage;
            }),
          )
        : [];

    const allMovies = [
      ...firstData.results,
      ...remainingPages.flatMap((p) => p.results),
    ];

    const yearCounts: Record<number, number> = {};
    for (const movie of allMovies) {
      const year = Number(movie.release_date?.slice(0, 4));
      if (!year || year < yearStart || year > yearEnd) continue;
      yearCounts[year] = (yearCounts[year] ?? 0) + 1;
    }

    const rawData: RawYearCount[] = Object.entries(yearCounts).map(([year, count]) => ({
      year: Number(year),
      count,
    }));

    console.log("[TMDB] Done", { points: rawData.length });

    return buildSourceResult(SOURCE_ID, LABEL, DESCRIPTION, rawData);
  } catch (error) {
    console.error("[TMDB] Error", error);
    return buildUnavailableSourceResult(SOURCE_ID, LABEL, DESCRIPTION, error);
  }
}
