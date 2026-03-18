import { fetchCrossRef } from "@/lib/apis/crossref";
import { fetchGitHub } from "@/lib/apis/github";
import { fetchNYT } from "@/lib/apis/nyt";
import { fetchOpenLibrary } from "@/lib/apis/openlibrary";
import { buildUnavailableSourceResult, sanitizeYearRange } from "@/lib/apis/common";
import { fetchSemanticScholar } from "@/lib/apis/semantic-scholar";
import { fetchWikipediaPageviews } from "@/lib/apis/wikipedia";
import { fetchTmdb } from "@/lib/apis/tmdb";
import type { SourceResult, StrataResponse } from "@/types/strata";

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  const timeout = new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms));
  return Promise.race([promise, timeout]);
}

export async function GET(request: Request): Promise<Response> {
  const startedAt = Date.now();

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    const queryParam = url.searchParams.get("query")?.trim();
    const query = q || queryParam;

    if (!query) {
      return Response.json(
        { error: "Missing query. Provide q or query parameter." },
        { status: 400 },
      );
    }

    const yearStartParam = url.searchParams.get("yearStart");
    const yearEndParam = url.searchParams.get("yearEnd");

    const { start, end } = sanitizeYearRange(
      yearStartParam ? Number(yearStartParam) : undefined,
      yearEndParam ? Number(yearEndParam) : undefined,
    );

    console.log("[ExploreAPI] Fetch start", { query, start, end });

    const timeoutFallback = (
      sourceId: SourceResult["source"],
      label: string,
      description: string,
    ) => buildUnavailableSourceResult(sourceId, label, description, "Timeout");

    const [wikipedia, openlibrary, crossref, semanticscholar, github, nyt, tmdb] =
      await Promise.all([
        withTimeout(
          fetchWikipediaPageviews(query, start, end),
          8000,
          timeoutFallback("wikipedia", "Public Interest", "Wikipedia pageviews per year"),
        ),
        withTimeout(
          fetchOpenLibrary(query, start, end),
          10000,
          timeoutFallback("openlibrary", "Books Published", "Books first published per year from Open Library"),
        ),
        withTimeout(
          fetchCrossRef(query, start, end),
          8000,
          timeoutFallback("crossref", "Scientific Papers", "Papers indexed by Crossref per year"),
        ),
        withTimeout(
          fetchSemanticScholar(query, start, end),
          12000,
          timeoutFallback("semanticscholar", "Academic Signals", "Semantic Scholar papers published per year"),
        ),
        withTimeout(
          fetchGitHub(query, start, end),
          15000,
          timeoutFallback("github", "Developer Adoption", "GitHub repositories created per year"),
        ),
        withTimeout(
          fetchNYT(query, start, end),
          10000,
          timeoutFallback("nyt", "Media Coverage", "New York Times articles per year"),
        ),
        withTimeout(
          fetchTmdb(query, start, end),
          10000,
          timeoutFallback("tmdb", "Film & TV", "Movies and series mentioning this concept per year (TMDB)"),
        ),
      ]);

    const sources = [wikipedia, openlibrary, crossref, semanticscholar, github, nyt, tmdb];
    const sourcesAvailable = sources.filter((source) => source.available).length;
    const sourcesFailed = sources.length - sourcesAvailable;
    const durationMs = Date.now() - startedAt;

    const response: StrataResponse = {
      query,
      yearRange: { start, end },
      sources,
      meta: {
        fetchedAt: new Date().toISOString(),
        durationMs,
        sourcesAvailable,
        sourcesFailed,
      },
    };

    console.log("[ExploreAPI] Fetch complete", {
      durationMs,
      sourcesAvailable,
      sourcesFailed,
    });

    return Response.json(response);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error("[ExploreAPI] Unhandled error", {
      message,
      durationMs,
    });

    return Response.json(
      {
        error: "Failed to fetch exploration data",
        message,
      },
      { status: 500 },
    );
  }
}
