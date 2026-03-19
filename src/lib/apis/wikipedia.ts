import type { MonthlyDataPoint, TimeSeries } from "@/types/strata";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WikipediaItem {
  timestamp: string;
  views: number;
}

interface WikipediaResponse {
  items?: WikipediaItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolveCanonicalTitle(query: string): Promise<string> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&list=search` +
    `&srsearch=${encodeURIComponent(query)}&format=json&srlimit=1&origin=*`;
  try {
    const data = await fetch(url, { cache: "no-store" }).then((r) => r.json());
    const title = data.query?.search?.[0]?.title as string | undefined;
    if (title) return title;
  } catch {
    // fall through to default
  }
  const underscored = query.trim().replace(/\s+/g, "_");
  return underscored[0].toUpperCase() + underscored.slice(1);
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

export async function fetchWikipediaMonthly(
  query: string,
  endDate: string, // "YYYY-MM"
): Promise<TimeSeries> {
  const ID = "wikipedia" as const;
  const LABEL = "Wikipedia Pageviews";

  try {
    const title = await resolveCanonicalTitle(query);
    const endParam = endDate.replace("-", "") + "0100";
    const endpoint =
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia` +
      `/all-access/user/${encodeURIComponent(title)}/monthly/2015070100/${endParam}`;

    console.log("[Explore3D][Wikipedia] Fetching", { title, endParam });

    const response = await fetch(endpoint, {
      headers: { "User-Agent": "Strata/1.0 (hackathon project)" },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Wikipedia ${response.status}: ${text.slice(0, 120)}`);
    }

    const payload = (await response.json()) as WikipediaResponse;
    const data: MonthlyDataPoint[] = [];

    for (const item of payload.items ?? []) {
      const ts = item.timestamp; // "YYYYMM00"
      const year = Number(ts.slice(0, 4));
      const month = Number(ts.slice(4, 6));
      const count = Number(item.views);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(count)) continue;
      if (year < 2015 || month < 1 || month > 12) continue;
      data.push({ year, month, count });
    }

    console.log("[Explore3D][Wikipedia] Done", { points: data.length });
    return { id: ID, label: LABEL, available: true, data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Explore3D][Wikipedia] Error", msg);
    return { id: ID, label: LABEL, available: false, error: msg, data: [] };
  }
}
