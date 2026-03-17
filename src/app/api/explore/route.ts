import { fetchCrossRef } from "@/lib/apis/crossref";
import { fetchGitHub } from "@/lib/apis/github";
import { fetchNYT } from "@/lib/apis/nyt";
import { fetchOpenLibrary } from "@/lib/apis/openlibrary";
import { sanitizeYearRange } from "@/lib/apis/common";
import { fetchSemanticScholar } from "@/lib/apis/semantic-scholar";
import { fetchWikipediaPageviews } from "@/lib/apis/wikipedia";
import type { StrataResponse } from "@/types/strata";

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

    const [wikipedia, openlibrary, crossref, semanticscholar, github, nyt] =
      await Promise.all([
        fetchWikipediaPageviews(query, start, end),
        fetchOpenLibrary(query, start, end),
        fetchCrossRef(query, start, end),
        fetchSemanticScholar(query, start, end),
        fetchGitHub(query, start, end),
        fetchNYT(query, start, end),
      ]);

    const sources = [wikipedia, openlibrary, crossref, semanticscholar, github, nyt];
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
