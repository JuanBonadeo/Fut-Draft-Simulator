import {
  buildSourceResult,
  buildUnavailableSourceResult,
} from "@/lib/apis/common";
import type { RawYearCount, SourceResult } from "@/types/strata";

const SOURCE_ID = "github" as const;
const LABEL = "Developer Adoption";
const DESCRIPTION = "GitHub repositories created per year";

const GITHUB_SAMPLE_YEARS = [1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024] as const;

interface GitHubSearchResponse {
  total_count?: number;
}

async function fetchGitHubYear(
  query: string,
  year: number,
  token: string | undefined,
): Promise<RawYearCount> {
  const searchTerm = `${query} created:${year}-01-01..${year}-12-31`;
  const endpoint = `https://api.github.com/search/repositories?q=${encodeURIComponent(searchTerm)}&per_page=1`;

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (response.status === 403) {
    console.log(`[GitHub] Rate limited for year ${year}, returning 0`);
    return { year, count: 0 };
  }

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as GitHubSearchResponse;
  const count = Number(payload.total_count ?? 0);

  return {
    year,
    count: Number.isFinite(count) && count > 0 ? count : 0,
  };
}

export async function fetchGitHub(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<SourceResult> {
  try {
    const token = process.env.GITHUB_TOKEN;
    const startYear = Math.max(2008, yearStart);

    console.log("[GitHub] Fetching", {
      query,
      startYear,
      yearEnd,
      hasToken: Boolean(token),
    });

    const filteredYears = GITHUB_SAMPLE_YEARS.filter(
      (y) => y >= startYear && y <= yearEnd,
    );

    const rawData = await Promise.all(
      filteredYears.map((year) => fetchGitHubYear(query, year, token)),
    );

    const nonZeroData = rawData.filter((item) => item.count > 0);
    const result = buildSourceResult(SOURCE_ID, LABEL, DESCRIPTION, nonZeroData);

    console.log("[GitHub] Completed", {
      available: result.available,
      points: result.data.length,
      totalCount: result.totalCount,
    });

    return result;
  } catch (error) {
    console.error("[GitHub]", error);
    return buildUnavailableSourceResult(SOURCE_ID, LABEL, DESCRIPTION, error);
  }
}
