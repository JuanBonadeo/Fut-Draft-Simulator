import { fetchCoreMonthly } from "@/lib/apis/core-papers";
import { fetchNytMonthly } from "@/lib/apis/nyt";
import { fetchOpenLibraryMonthly } from "@/lib/apis/openlibrary";
import { fetchTmdbMonthly } from "@/lib/apis/tmdb";
import { fetchWikipediaMonthly } from "@/lib/apis/wikipedia";
import type { Explore3DResponse, TimeSeries } from "@/types/strata";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

function unavailable(id: TimeSeries["id"], label: string, error: string): TimeSeries {
  return { id, label, available: false, error, data: [] };
}

function currentEndDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();

  if (!query) {
    return Response.json({ error: "Missing q parameter" }, { status: 400 });
  }

  const endDate = currentEndDate();
  const coreKey = process.env.CORE_API_KEY;
  const nytKey = process.env.NYT_API_KEY;

  console.log("[Explore3D] Fetch start", { query, endDate });

  const [wikipedia, books, papers, movies, news] = await Promise.all([
    withTimeout(
      fetchWikipediaMonthly(query, endDate),
      10_000,
      unavailable("wikipedia", "Wikipedia Pageviews", "Timeout"),
    ),
    withTimeout(
      fetchOpenLibraryMonthly(query),
      15_000,
      unavailable("books", "Books Published", "Timeout"),
    ),
    withTimeout(
      coreKey
        ? fetchCoreMonthly(query, coreKey).then((data): TimeSeries => ({
            id: "papers",
            label: "Scientific Papers",
            available: data.some((d) => d.count > 0),
            data,
          }))
        : Promise.resolve(unavailable("papers", "Scientific Papers", "CORE_API_KEY not configured")),
      45_000,
      unavailable("papers", "Scientific Papers", "Timeout"),
    ),
    withTimeout(
      fetchTmdbMonthly(query),
      8_000,
      unavailable("movies", "Films & Series", "Timeout"),
    ),
    withTimeout(
      nytKey
        ? fetchNytMonthly(query, nytKey)
        : Promise.resolve(unavailable("news", "News Articles", "NYT_API_KEY not configured")),
      15_000,
      unavailable("news", "News Articles", "Timeout"),
    ),
  ]);

  const response: Explore3DResponse = {
    query,
    startDate: "2015-07",
    endDate,
    series: [wikipedia, books, papers, movies, news],
  };

  const available = response.series.filter((s) => s.available).length;
  console.log("[Explore3D] Fetch complete", { available, total: 5 });

  return Response.json(response);
}
