import {
  buildSourceResult,
  buildUnavailableSourceResult,
  sleep,
} from "@/lib/apis/common";
import type { RawYearCount, SourceResult } from "@/types/strata";

const SOURCE_ID = "nyt" as const;
const LABEL = "Media Coverage";
const DESCRIPTION = "Estimated New York Times articles per year";
const REPRESENTATIVE_YEARS = [1995, 2000, 2005, 2010, 2015, 2020, 2025];

interface NYTArticle {
  headline?: {
    main?: string;
  };
  abstract?: string;
  lead_paragraph?: string;
  snippet?: string;
}

interface NYTArchiveResponse {
  response?: {
    docs?: NYTArticle[];
  };
}

function containsQuery(article: NYTArticle, normalizedQuery: string): boolean {
  const content = [
    article.headline?.main,
    article.abstract,
    article.lead_paragraph,
    article.snippet,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return content.includes(normalizedQuery);
}

async function fetchArchiveMonth(
  year: number,
  month: number,
  apiKey: string,
  query: string,
): Promise<NYTArchiveResponse> {
  const endpoint = `https://api.nytimes.com/svc/archive/v1/${year}/${month}.json?api-key=${apiKey}`;

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

    return (await response.json()) as NYTArchiveResponse;
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

    const normalizedQuery = query.toLowerCase();
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
      const payload = await fetchArchiveMonth(year, 1, apiKey, query);
      const matches = (payload.response?.docs ?? []).filter((article) =>
        containsQuery(article, normalizedQuery),
      );

      rawData.push({
        year,
        count: matches.length * 12,
      });

      if (index < sampleYears.length - 1) {
        await sleep(2000);
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
