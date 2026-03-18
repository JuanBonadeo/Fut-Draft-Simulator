import {
  buildSourceResult,
  buildUnavailableSourceResult,
} from "@/lib/apis/common";
import type { RawYearCount, SourceResult } from "@/types/strata";

const SOURCE_ID = "wikipedia" as const;
const LABEL = "Public Interest";
const DESCRIPTION = "Wikipedia pageviews per year";

interface WikipediaItem {
  timestamp: string;
  views: number;
}

interface WikipediaResponse {
  items?: WikipediaItem[];
}

function buildWikipediaTopic(query: string): string {
  const underscored = query.trim().replace(/\s+/g, "_");
  if (!underscored) {
    return "";
  }

  return underscored[0].toUpperCase() + underscored.slice(1);
}

async function resolveCanonicalTitle(query: string): Promise<string> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&list=search` +
    `&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1&origin=*`;
  const data = await fetch(url, { cache: "no-store" }).then((r) => r.json());
  return (data.query?.search?.[0]?.title as string | undefined) ?? buildWikipediaTopic(query);
}

function buildMonthlyDateRange(yearStart: number, yearEnd: number): {
  startDate: string;
  endDate: string;
} {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, "0");

  const safeStart = Math.max(yearStart, 2015);
  const startMonth = safeStart === 2015 ? "07" : "01";

  const safeEnd = Math.min(yearEnd, currentYear);
  const endMonth = safeEnd === currentYear ? currentMonth : "12";

  return {
    startDate: `${safeStart}${startMonth}0100`,
    endDate: `${safeEnd}${endMonth}0100`,
  };
}

export async function fetchWikipediaPageviews(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<SourceResult> {
  try {
    const topic = await resolveCanonicalTitle(query);
    if (!topic) {
      throw new Error("Query cannot be empty");
    }

    const { startDate, endDate } = buildMonthlyDateRange(yearStart, yearEnd);
    const endpoint = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(topic)}/monthly/${startDate}/${endDate}`;

    console.log("[Wikipedia] Fetching", { topic, startDate, endDate });

    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "Strata/1.0 (hackathon project; contacto@email.com)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Wikipedia request failed: ${response.status} ${response.statusText} ${responseText.slice(0, 180)}`,
      );
    }

    const payload = (await response.json()) as WikipediaResponse;
    const yearlyMap = new Map<number, number>();

    for (const item of payload.items ?? []) {
      const year = Number(item.timestamp.slice(0, 4));
      if (!Number.isFinite(year) || year < yearStart || year > yearEnd) {
        continue;
      }

      const views = Number(item.views);
      if (!Number.isFinite(views) || views < 0) {
        continue;
      }

      yearlyMap.set(year, (yearlyMap.get(year) ?? 0) + views);
    }

    const rawData: RawYearCount[] = [...yearlyMap.entries()].map(([year, count]) => ({
      year,
      count,
    }));

    const result = buildSourceResult(SOURCE_ID, LABEL, DESCRIPTION, rawData);
    console.log("[Wikipedia] Completed", {
      available: result.available,
      points: result.data.length,
      totalCount: result.totalCount,
    });

    return result;
  } catch (error) {
    console.error("[Wikipedia]", error);
    return buildUnavailableSourceResult(SOURCE_ID, LABEL, DESCRIPTION, error);
  }
}
