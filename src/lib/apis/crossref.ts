import {
  buildSourceResult,
  buildUnavailableSourceResult,
} from "@/lib/apis/common";
import type { RawYearCount, SourceResult } from "@/types/strata";

const SOURCE_ID = "crossref" as const;
const LABEL = "Scientific Papers";
const DESCRIPTION = "Papers indexed by Crossref per year";

interface CrossRefFacetValues {
  [key: string]: number;
}

interface CrossRefResponse {
  message?: {
    facets?: Record<string, { values?: CrossRefFacetValues }>;
  };
}

function parseFacetValues(payload: CrossRefResponse): RawYearCount[] {
  const facets = payload.message?.facets;
  if (!facets) {
    return [];
  }

  const publishedValues =
    facets.published?.values ??
    facets["published-print"]?.values ??
    facets["published-online"]?.values;

  if (!publishedValues || typeof publishedValues !== "object") {
    return [];
  }

  return Object.entries(publishedValues)
    .map(([yearRaw, count]) => ({
      year: Number(yearRaw),
      count: Number(count),
    }))
    .filter((item) => Number.isFinite(item.year) && Number.isFinite(item.count) && item.count > 0);
}

export async function fetchCrossRef(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<SourceResult> {
  try {
    const endpoint = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&filter=from-pub-date:${yearStart},until-pub-date:${yearEnd}&rows=0&facet=published:*`;

    console.log("[CrossRef] Fetching", { query, yearStart, yearEnd });

    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "Strata/1.0 (mailto:tu@email.com)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`CrossRef request failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as CrossRefResponse;
    const rawData = parseFacetValues(payload).filter(
      (item) => item.year >= yearStart && item.year <= yearEnd,
    );

    const result = buildSourceResult(SOURCE_ID, LABEL, DESCRIPTION, rawData);
    console.log("[CrossRef] Completed", {
      available: result.available,
      points: result.data.length,
      totalCount: result.totalCount,
    });

    return result;
  } catch (error) {
    console.error("[CrossRef]", error);
    return buildUnavailableSourceResult(SOURCE_ID, LABEL, DESCRIPTION, error);
  }
}
