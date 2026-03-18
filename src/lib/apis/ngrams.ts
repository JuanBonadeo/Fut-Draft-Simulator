import { buildSourceResult, buildUnavailableSourceResult } from "@/lib/apis/common";
import type { RawYearCount, SourceResult } from "@/types/strata";

const SOURCE_ID = "ngrams" as const;
const LABEL = "Literature Frequency";
const DESCRIPTION = "Frequency in published books per year (Google Books Ngrams)";

// Ngrams corpus only covers up to 2019
const NGRAMS_MIN_YEAR = 1800;
const NGRAMS_MAX_YEAR = 2019;

interface NgramResult {
  ngram: string;
  timeseries: number[];
  year_start: number;
  year_end: number;
}

export async function fetchNgrams(
  query: string,
  yearStart: number,
  yearEnd: number,
): Promise<SourceResult> {
  try {
    const clampedStart = Math.max(yearStart, NGRAMS_MIN_YEAR);
    const clampedEnd = Math.min(yearEnd, NGRAMS_MAX_YEAR);

    // No overlap with the corpus range → return unavailable without fetching
    if (clampedStart > clampedEnd) {
      return buildUnavailableSourceResult(
        SOURCE_ID,
        LABEL,
        DESCRIPTION,
        "Year range outside Google Books Ngrams coverage (1800–2019)",
      );
    }

    const endpoint =
      `https://books.google.com/ngrams/json` +
      `?content=${encodeURIComponent(query)}` +
      `&year_start=${clampedStart}` +
      `&year_end=${clampedEnd}` +
      `&corpus=en-2019` +
      `&smoothing=3`;

    console.log("[Ngrams] Fetching", { query, clampedStart, clampedEnd });

    const response = await fetch(endpoint, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Ngrams request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as NgramResult[];

    // API returns an array of entries (one per term); take the first (our query)
    const entry = data[0];
    if (!entry || !Array.isArray(entry.timeseries)) {
      return buildUnavailableSourceResult(SOURCE_ID, LABEL, DESCRIPTION, "No data returned");
    }

    // Map timeseries index → year, convert relative frequency × 1_000_000 to readable count
    const rawData: RawYearCount[] = entry.timeseries
      .map((freq, i) => ({
        year: entry.year_start + i,
        count: Math.round(freq * 1_000_000),
      }))
      .filter((point) => point.count > 0);

    console.log("[Ngrams] Done", { points: rawData.length });

    return buildSourceResult(SOURCE_ID, LABEL, DESCRIPTION, rawData);
  } catch (error) {
    console.error("[Ngrams] Error", error);
    return buildUnavailableSourceResult(SOURCE_ID, LABEL, DESCRIPTION, error);
  }
}
