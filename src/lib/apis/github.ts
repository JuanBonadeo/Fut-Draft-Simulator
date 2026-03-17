import {
  buildSourceResult,
  buildUnavailableSourceResult,
  sleep,
} from "@/lib/apis/common";
import type { RawYearCount, SourceResult } from "@/types/strata";

const SOURCE_ID = "github" as const;
const LABEL = "Developer Adoption";
const DESCRIPTION = "GitHub repositories created per year";

interface GitHubSearchResponse {
  total_count?: number;
}

export async function fetchGitHub(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<SourceResult> {
  try {
    const token = process.env.GITHUB_TOKEN;
    const startYear = Math.max(2008, yearStart);
    const rawData: RawYearCount[] = [];

    console.log("[GitHub] Fetching", {
      query,
      startYear,
      yearEnd,
      hasToken: Boolean(token),
    });

    for (let year = startYear; year <= yearEnd; year += 1) {
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
        if (rawData.length > 0) {
          console.log("[GitHub] Rate limited, returning partial data");
          break;
        }

        throw new Error("GitHub rate limit reached");
      }

      if (!response.ok) {
        throw new Error(`GitHub request failed: ${response.status} ${response.statusText}`);
      }

      const payload = (await response.json()) as GitHubSearchResponse;
      const count = Number(payload.total_count ?? 0);

      rawData.push({
        year,
        count: Number.isFinite(count) && count > 0 ? count : 0,
      });

      if (year < yearEnd) {
        await sleep(2000);
      }
    }

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
