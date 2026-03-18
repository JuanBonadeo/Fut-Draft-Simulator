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
  | "crossref"
  | "tmdb";

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

export interface Artifact {
  title: string;
  author?: string;
  year: number;
  score: number;
  url?: string;
  imageUrl?: string;
  source: "openlibrary" | "semanticscholar" | "tmdb";
}

export interface DecadeArtifacts {
  decade: number;
  book?: Artifact;
  paper?: Artifact;
  movie?: Artifact;
}

export interface ArtifactsResponse {
  query: string;
  yearRange: { start: number; end: number };
  books: Artifact[];
  papers: Artifact[];
  movies: Artifact[];
  byDecade: DecadeArtifacts[];
}
