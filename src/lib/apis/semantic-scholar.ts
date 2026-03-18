import {
  buildSourceResult,
  buildUnavailableSourceResult,
  sleep,
} from "@/lib/apis/common";
import type { RawYearCount, SourceResult } from "@/types/strata";

const SOURCE_ID = "semanticscholar" as const;
const LABEL = "Academic Signals";
const DESCRIPTION = "Semantic Scholar papers published per year";
const PAGE_SIZE = 100;
const MAX_RESULTS = 1000;

interface SemanticScholarPaper {
  year?: number | null;
}

interface SemanticScholarResponse {
  total?: number;
  offset?: number;
  next?: number;
  data?: SemanticScholarPaper[];
}

export async function fetchSemanticScholar(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<SourceResult> {
  const yearlyMap = new Map<number, number>();

  try {
    console.log("[SemanticScholar] Fetching", { query, yearStart, yearEnd });

    let offset = 0;
    let hasMore = true;

    while (hasMore && offset < MAX_RESULTS) {
      const endpoint = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&offset=${offset}&limit=${PAGE_SIZE}&fields=year,citationCount`;

      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (response.status === 429) {
        if (yearlyMap.size > 0) {
          console.log("[SemanticScholar] Rate limited, returning partial data");
          break;
        }

        throw new Error("Semantic Scholar rate limit reached");
      }

      if (!response.ok) {
        throw new Error(
          `Semantic Scholar request failed: ${response.status} ${response.statusText}`,
        );
      }

      const payload = (await response.json()) as SemanticScholarResponse;
      const papers = payload.data ?? [];

      for (const paper of papers) {
        const year = Number(paper.year);
        if (!Number.isFinite(year) || year < yearStart || year > yearEnd) {
          continue;
        }

        yearlyMap.set(year, (yearlyMap.get(year) ?? 0) + 1);
      }

      const nextOffset = payload.next;
      hasMore = typeof nextOffset === "number" && papers.length > 0;
      offset = typeof nextOffset === "number" ? nextOffset : offset + PAGE_SIZE;

      if (hasMore) {
        await sleep(250);
      }
    }

    const rawData: RawYearCount[] = [...yearlyMap.entries()].map(([year, count]) => ({
      year,
      count,
    }));

    const result = buildSourceResult(SOURCE_ID, LABEL, DESCRIPTION, rawData);
    console.log("[SemanticScholar] Completed", {
      available: result.available,
      points: result.data.length,
      totalCount: result.totalCount,
    });

    return result;
  } catch (error) {
    console.error("[SemanticScholar]", error);
    return buildUnavailableSourceResult(SOURCE_ID, LABEL, DESCRIPTION, error);
  }
}
