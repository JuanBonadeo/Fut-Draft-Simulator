import {
  buildSourceResult,
  buildUnavailableSourceResult,
} from "@/lib/apis/common";
kwimport type { Artifact, RawYearCount, SourceResult } from "@/types/strata";

const SOURCE_ID = "openlibrary" as const;
const LABEL = "Books Published";
const DESCRIPTION = "Books first published per year from Open Library";

interface OpenLibraryDoc {
  first_publish_year?: number | null;
}

// Used by /subjects/{slug}.json endpoint (different shape from search API)
interface OpenLibrarySubjectWork {
  title?: string;
  authors?: { key: string; name: string }[];
  first_publish_year?: number;
  edition_count?: number;
  cover_id?: number;
}

interface OpenLibraryResponse {
  docs?: OpenLibraryDoc[];
}

function isValidPublishYear(value: unknown, yearStart: number, yearEnd: number): value is number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return false;
  }

  if (value < 1450 || value > 2100) {
    return false;
  }

  return value >= yearStart && value <= yearEnd;
}

export async function fetchOpenLibrary(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<SourceResult> {
  try {
    const endpoint = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=key,title,first_publish_year&limit=1000`;

    console.log("[OpenLibrary] Fetching", { query, yearStart, yearEnd });

    const response = await fetch(endpoint, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Open Library request failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as OpenLibraryResponse;
    const yearlyMap = new Map<number, number>();

    for (const doc of payload.docs ?? []) {
      const year = doc.first_publish_year;
      if (!isValidPublishYear(year, yearStart, yearEnd)) {
        continue;
      }

      yearlyMap.set(year, (yearlyMap.get(year) ?? 0) + 1);
    }

    const rawData: RawYearCount[] = [...yearlyMap.entries()].map(([year, count]) => ({
      year,
      count,
    }));

    const result = buildSourceResult(SOURCE_ID, LABEL, DESCRIPTION, rawData);
    console.log("[OpenLibrary] Completed", {
      available: result.available,
      points: result.data.length,
      totalCount: result.totalCount,
    });

    return result;
  } catch (error) {
    console.error("[OpenLibrary]", error);
    return buildUnavailableSourceResult(SOURCE_ID, LABEL, DESCRIPTION, error);
  }
}

export async function fetchOpenLibraryTopBooks(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<Artifact[]> {
  try {
    // /subjects/{slug}.json uses Open Library's curated subject tags — more accurate than free-text search
    const slug = query.toLowerCase().replace(/\s+/g, "_");
    const endpoint = `https://openlibrary.org/subjects/${encodeURIComponent(slug)}.json?limit=100`;

    console.log("[OpenLibrary] Fetching top books by subject", { slug, yearStart, yearEnd });

    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { works?: OpenLibrarySubjectWork[] };

    // Filter out conference proceedings series — they dominate edition_count unfairly
    const TITLE_NOISE = ["advances in", "proceedings", "workshop", "symposium", "knowledge discovery in databases"];
    const AUTHOR_NOISE = ["conference", "society", "symposium", "workshop", "congress", "association"];
    const isProceedings = (w: OpenLibrarySubjectWork) => {
      const title = w.title?.toLowerCase() ?? "";
      const author = w.authors?.[0]?.name?.toLowerCase() ?? "";
      return TITLE_NOISE.some((n) => title.includes(n)) || AUTHOR_NOISE.some((n) => author.includes(n));
    };

    return (data.works ?? [])
      .filter((d) => {
        const y = d.first_publish_year;
        return typeof y === "number" && y >= yearStart && y <= yearEnd && !isProceedings(d);
      })
      .map((d) => ({
        title: d.title ?? "Unknown",
        author: d.authors?.[0]?.name,
        year: d.first_publish_year!,
        score: d.edition_count ?? 0,
        imageUrl: d.cover_id
          ? `https://covers.openlibrary.org/b/id/${d.cover_id}-M.jpg`
          : undefined,
        source: "openlibrary" as const,
      }))
      .sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}
