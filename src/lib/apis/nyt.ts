import {
  buildSourceResult,
  buildUnavailableSourceResult,
  sleep,
} from "@/lib/apis/common";
import type { RawYearCount, SourceResult } from "@/types/strata";

const SOURCE_ID = "nyt" as const;
const LABEL = "Media Coverage";
const DESCRIPTION = "New York Times articles per year";
const REPRESENTATIVE_YEARS = [1995, 2000, 2005, 2010, 2015, 2020, 2025];

interface NYTSearchResponse {
  response?: {
    meta?: {
      hits?: number;
    };
  };
}

async function fetchNYTYear(
  year: number,
  apiKey: string,
  query: string,
): Promise<RawYearCount> {
  const endpoint =
    `https://api.nytimes.com/svc/search/v2/articlesearch.json` +
    `?q=${encodeURIComponent(query)}` +
    `&fq=pub_year:(${year})` +
    `&facet_field=pub_year&facet=true` +
    `&api-key=${apiKey}`;

  let attempt = 0;
  let backoffMs = 2000;

  while (attempt < 3) {
    const response = await fetch(endpoint, { cache: "no-store" });

    if (response.status === 429) {
      attempt += 1;
      if (attempt >= 3) {
        throw new Error(`NYT rate limit reached for year ${year} query ${query}`);
      }

      await sleep(backoffMs);
      backoffMs *= 2;
      continue;
    }

    if (!response.ok) {
      throw new Error(`NYT request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as NYTSearchResponse;
    const count = data.response?.meta?.hits ?? 0;

    return { year, count };
  }

  throw new Error(`NYT request exhausted retries for year ${year}`);
}

export async function fetchNYT(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<SourceResult> {
  try {
    const apiKey = process.env.NYT_API_KEY;

    if (!apiKey) {
      return buildUnavailableSourceResult(
        SOURCE_ID,
        LABEL,
        DESCRIPTION,
        "NYT_API_KEY is not configured",
      );
    }

    const sampleYears = REPRESENTATIVE_YEARS.filter(
      (year) => year >= yearStart && year <= yearEnd,
    );

    if (sampleYears.length === 0) {
      return buildUnavailableSourceResult(
        SOURCE_ID,
        LABEL,
        DESCRIPTION,
        "No representative years available for selected range",
      );
    }

    console.log("[NYT] Fetching", { query, sampleYears });

    const rawData: RawYearCount[] = [];

    for (let index = 0; index < sampleYears.length; index += 1) {
      const year = sampleYears[index];
      const point = await fetchNYTYear(year, apiKey, query);
      rawData.push(point);

      if (index < sampleYears.length - 1) {
        await sleep(1100);
      }
    }

    const nonZeroData = rawData.filter((item) => item.count > 0);
    const result = buildSourceResult(SOURCE_ID, LABEL, DESCRIPTION, nonZeroData);

    console.log("[NYT] Completed", {
      available: result.available,
      points: result.data.length,
      totalCount: result.totalCount,
    });

    return result;
  } catch (error) {
    console.error("[NYT]", error);
    return buildUnavailableSourceResult(SOURCE_ID, LABEL, DESCRIPTION, error);
  }
}
