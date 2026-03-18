import {
  buildSourceResult,
  buildUnavailableSourceResult,
} from "@/lib/apis/common";
import type { Artifact, RawYearCount, SourceResult } from "@/types/strata";

const SOURCE_ID = "openlibrary" as const;
const LABEL = "Books Published";
const DESCRIPTION = "Books first published per year from Open Library";

interface OpenLibraryDoc {
  first_publish_year?: number | null;
}

interface OpenLibraryTopDoc {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  edition_count?: number;
  cover_i?: number;
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
    const endpoint =
      `https://openlibrary.org/search.json` +
      `?q=${encodeURIComponent(query)}` +
      `&fields=key,title,author_name,first_publish_year,edition_count,cover_i` +
      `&sort=editions&limit=50`;

    console.log("[OpenLibrary] Fetching top books", { query, yearStart, yearEnd });

    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { docs?: OpenLibraryTopDoc[] };

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
        imageUrl: d.cover_i
          ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
          : undefined,
        source: "openlibrary" as const,
      }))
      .sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}
