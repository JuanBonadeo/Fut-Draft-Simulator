export interface DataPoint {
  year: number;
  count: number;
  normalized: number;
}

export type SourceId =
  | "openlibrary"
  | "wikipedia"
  | "semanticscholar"
  | "github"
  | "nyt"
  | "crossref";

export interface SourceResult {
  source: SourceId;
  label: string;
  description: string;
  data: DataPoint[];
  totalCount: number;
  peakYear: number;
  available: boolean;
  error?: string;
}

export interface StrataRequest {
  query: string;
  yearStart?: number;
  yearEnd?: number;
}

export interface StrataResponse {
  query: string;
  yearRange: { start: number; end: number };
  sources: SourceResult[];
  meta: {
    fetchedAt: string;
    durationMs: number;
    sourcesAvailable: number;
    sourcesFailed: number;
  };
}

export interface RawYearCount {
  year: number;
  count: number;
}

const SOURCE_CONFIG: Array<{
  source: SourceId;
  label: string;
  description: string;
  multiplier: number;
}> = [
  {
    source: "github",
    label: "GitHub",
    description: "Repositorios y actividad open source",
    multiplier: 1.3,
  },
  {
    source: "wikipedia",
    label: "Wikipedia",
    description: "Cobertura enciclopedica y consultas historicas",
    multiplier: 1.1,
  },
  {
    source: "openlibrary",
    label: "OpenLibrary",
    description: "Presencia en catalogos de libros y ediciones",
    multiplier: 0.9,
  },
  {
    source: "semanticscholar",
    label: "Semantic Scholar",
    description: "Produccion y citacion academica",
    multiplier: 1.4,
  },
  {
    source: "crossref",
    label: "Crossref",
    description: "Publicaciones con DOI y registros formales",
    multiplier: 1.15,
  },
  {
    source: "nyt",
    label: "NYT",
    description: "Cobertura periodistica y agenda publica",
    multiplier: 1,
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const hashQuery = (query: string) => {
  return query
    .toLowerCase()
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
};

const makeSourceData = (
  seed: number,
  yearStart: number,
  yearEnd: number,
  multiplier: number,
): DataPoint[] => {
  const years = yearEnd - yearStart + 1;
  const base = 42 + (seed % 26);

  const raw: RawYearCount[] = Array.from({ length: years }, (_, index) => {
    const year = yearStart + index;
    const trend = index * (1.6 + (seed % 5) * 0.18);
    const wave = Math.sin(index * 0.8 + (seed % 13)) * (13 + (seed % 7));
    const count = Math.max(0, Math.round((base + trend + wave) * multiplier));

    return {
      year,
      count,
    };
  });

  const maxCount = Math.max(...raw.map((item) => item.count), 1);

  return raw.map((item) => ({
    year: item.year,
    count: item.count,
    normalized: Number(((item.count / maxCount) * 100).toFixed(2)),
  }));
};

export function buildStrataPreview(request: StrataRequest): StrataResponse {
  const query = request.query.trim() || "inteligencia artificial";
  const yearStart = request.yearStart ?? 2006;
  const yearEnd = request.yearEnd ?? new Date().getFullYear();
  const seed = hashQuery(query);

  const sources: SourceResult[] = SOURCE_CONFIG.map((config, index) => {
    const sourceSeed = seed + (index + 1) * 17;
    const degraded = sourceSeed % 11 === 0;

    if (degraded) {
      return {
        source: config.source,
        label: config.label,
        description: config.description,
        data: [],
        totalCount: 0,
        peakYear: yearStart,
        available: false,
        error: "Source timeout during aggregation",
      };
    }

    const data = makeSourceData(sourceSeed, yearStart, yearEnd, config.multiplier);
    const totalCount = data.reduce((acc, item) => acc + item.count, 0);
    const peakYear = data.reduce(
      (best, point) => (point.count > best.count ? point : best),
      data[0],
    ).year;

    return {
      source: config.source,
      label: config.label,
      description: config.description,
      data,
      totalCount,
      peakYear,
      available: true,
    };
  });

  const sourcesAvailable = sources.filter((source) => source.available).length;
  const sourcesFailed = sources.length - sourcesAvailable;
  const deterministicFetchedAt = new Date(
    Date.UTC(yearEnd, seed % 12, (seed % 27) + 1, 12, seed % 60, 0),
  ).toISOString();

  return {
    query,
    yearRange: {
      start: yearStart,
      end: yearEnd,
    },
    sources,
    meta: {
      fetchedAt: deterministicFetchedAt,
      durationMs: 180 + (seed % 620),
      sourcesAvailable,
      sourcesFailed,
    },
  };
}
