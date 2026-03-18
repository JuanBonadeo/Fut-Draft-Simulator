import { sanitizeYearRange } from "@/lib/apis/common";
import type { Artifact, ArtifactsResponse, DecadeArtifacts } from "@/types/strata";

interface OLDoc {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  edition_count?: number;
  cover_i?: number;
}

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

async function fetchBooks(query: string, yearStart: number, yearEnd: number): Promise<Artifact[]> {
  try {
    const url =
      `https://openlibrary.org/search.json` +
      `?q=${encodeURIComponent(query)}` +
      `&fields=key,title,author_name,first_publish_year,edition_count,cover_i` +
      `&sort=editions&limit=50`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { docs?: OLDoc[] };

    return (data.docs ?? [])
      .filter((d) => {
        const y = d.first_publish_year;
        return typeof y === "number" && y >= yearStart && y <= yearEnd;
      })
      .map((d) => ({
        title: d.title ?? "Unknown",
        author: d.author_name?.[0],
        year: d.first_publish_year!,
        score: d.edition_count ?? 0,
        imageUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
        source: "openlibrary" as const,
      }))
      .sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

async function fetchPapers(query: string, yearStart: number, yearEnd: number): Promise<Artifact[]> {
  try {
    const url =
      `https://api.semanticscholar.org/graph/v1/paper/search` +
      `?query=${encodeURIComponent(query)}` +
      `&fields=title,year,citationCount,authors,externalIds` +
      `&offset=0&limit=100`;

    const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
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
    const url =
      `https://api.themoviedb.org/3/search/movie` +
      `?query=${encodeURIComponent(query)}&api_key=${apiKey}&page=1`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: TmdbSearchMovie[] };

    return (data.results ?? [])
      .filter((m) => {
        const y = Number(m.release_date?.slice(0, 4));
        return Number.isFinite(y) && y >= yearStart && y <= yearEnd && (m.vote_count ?? 0) > 200;
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
    fetchBooks(query, start, end),
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
