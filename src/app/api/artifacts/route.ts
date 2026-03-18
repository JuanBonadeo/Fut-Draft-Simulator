import { sanitizeYearRange, sleep } from "@/lib/apis/common";
import { fetchOpenLibraryTopBooks } from "@/lib/apis/openlibrary";
import type { Artifact, ArtifactsResponse, DecadeArtifacts } from "@/types/strata";

interface SSPaper {
  title?: string;
  year?: number | null;
  citationCount?: number | null;
  authors?: { name: string }[];
  externalIds?: { CorpusId?: number };
}

interface TmdbSearchMovie {
  title?: string;
  release_date?: string;
  popularity?: number;
  vote_count?: number;
  poster_path?: string | null;
}


async function fetchPapers(query: string, yearStart: number, yearEnd: number): Promise<Artifact[]> {
  try {
    const url =
      `https://api.semanticscholar.org/graph/v1/paper/search` +
      `?query=${encodeURIComponent(query)}` +
      `&fields=title,year,citationCount,authors,externalIds` +
      `&year=${yearStart}-${yearEnd}` +
      `&offset=0&limit=100`;

    const ssApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
    const ssHeaders: HeadersInit = {
      Accept: "application/json",
      ...(ssApiKey ? { "x-api-key": ssApiKey } : {}),
    };
    let res = await fetch(url, { cache: "no-store", headers: ssHeaders });
    if (res.status === 429) {
      console.warn("[Artifacts/Papers] Rate limited, retrying after 2s");
      await sleep(2000);
      res = await fetch(url, { cache: "no-store", headers: ssHeaders });
    }
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: SSPaper[] };

    return (data.data ?? [])
      .filter((p) => {
        const y = Number(p.year);
        return Number.isFinite(y) && y >= yearStart && y <= yearEnd && (p.citationCount ?? 0) > 0;
      })
      .map((p) => ({
        title: p.title ?? "Unknown",
        author: p.authors?.[0]?.name,
        year: Number(p.year),
        score: p.citationCount!,
        url: p.externalIds?.CorpusId
          ? `https://www.semanticscholar.org/paper/${p.externalIds.CorpusId}`
          : undefined,
        source: "semanticscholar" as const,
      }))
      .sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

async function fetchMovies(query: string, yearStart: number, yearEnd: number): Promise<Artifact[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return [];

  try {
    // Step 1: resolve query to a TMDB keyword ID for accurate topic matching
    const kwRes = await fetch(
      `https://api.themoviedb.org/3/search/keyword?query=${encodeURIComponent(query)}&api_key=${apiKey}`,
      { cache: "no-store" },
    );
    const kwData = kwRes.ok
      ? ((await kwRes.json()) as { results?: { id: number; name: string }[] })
      : { results: [] };
    // Combine all matching keyword IDs with OR (|) for maximum coverage
    const keywordIds = kwData.results?.map((k) => k.id).join("|");

    // Step 2: fetch 2 pages in parallel — discover by keyword (better) or title search (fallback)
    const fetchPage = async (page: number): Promise<TmdbSearchMovie[]> => {
      const url = keywordIds
        ? `https://api.themoviedb.org/3/discover/movie?with_keywords=${keywordIds}&sort_by=vote_count.desc&api_key=${apiKey}&page=${page}`
        : `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${apiKey}&page=${page}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return [];
      const data = (await res.json()) as { results?: TmdbSearchMovie[] };
      return data.results ?? [];
    };

    const [page1, page2] = await Promise.all([fetchPage(1), fetchPage(2)]);
    const allResults = [...page1, ...page2];

    return allResults
      .filter((m) => {
        const y = Number(m.release_date?.slice(0, 4));
        return Number.isFinite(y) && y >= yearStart && y <= yearEnd && (m.vote_count ?? 0) > 50;
      })
      .map((m) => ({
        title: m.title ?? "Unknown",
        year: Number(m.release_date!.slice(0, 4)),
        score: m.popularity ?? 0,
        imageUrl: m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : undefined,
        source: "tmdb" as const,
      }))
      .sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

function buildByDecade(
  books: Artifact[],
  papers: Artifact[],
  movies: Artifact[],
  yearStart: number,
  yearEnd: number,
): DecadeArtifacts[] {
  const firstDecade = Math.ceil(yearStart / 10) * 10;
  const lastDecade = Math.floor(yearEnd / 10) * 10;
  const result: DecadeArtifacts[] = [];

  for (let decade = firstDecade; decade <= lastDecade; decade += 10) {
    const inDecade = (a: Artifact) => a.year >= decade && a.year <= decade + 9;
    result.push({
      decade,
      book: books.find(inDecade),
      paper: papers.find(inDecade),
      movie: movies.find(inDecade),
    });
  }

  return result;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? url.searchParams.get("query") ?? "").trim();
  if (!query) return Response.json({ error: "Missing query" }, { status: 400 });

  const { start, end } = sanitizeYearRange(
    url.searchParams.get("yearStart") ? Number(url.searchParams.get("yearStart")) : undefined,
    url.searchParams.get("yearEnd") ? Number(url.searchParams.get("yearEnd")) : undefined,
  );

  const [books, papers, movies] = await Promise.all([
    fetchOpenLibraryTopBooks(query, start, end),
    fetchPapers(query, start, end),
    fetchMovies(query, start, end),
  ]);

  const byDecade = buildByDecade(books, papers, movies, start, end);

  const response: ArtifactsResponse = {
    query,
    yearRange: { start, end },
    books: books.slice(0, 3),
    papers: papers.slice(0, 3),
    movies: movies.slice(0, 3),
    byDecade,
  };

  return Response.json(response);
}
