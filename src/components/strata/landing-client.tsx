"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  Brain,
  ChartSpline,
  FileText,
  Github,
  Globe,
  LoaderCircle,
  Network,
  Newspaper,
  Search,
} from "lucide-react";
import clsx from "clsx";
import {
  buildStrataPreview,
  type SourceId,
  type StrataResponse,
} from "@/lib/strata";

type Locale = "es" | "en";

type TimeRange = 2006 | 2012 | 2018;

const SOURCES: Array<{
  id: SourceId;
  subtitleEs: string;
  subtitleEn: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "github",
    subtitleEs: "Codigo y comunidad",
    subtitleEn: "Code and developer community",
    color: "#7dd3fc",
    icon: Github,
  },
  {
    id: "wikipedia",
    subtitleEs: "Contexto enciclopedico",
    subtitleEn: "Encyclopedic context",
    color: "#60a5fa",
    icon: Globe,
  },
  {
    id: "openlibrary",
    subtitleEs: "Rastros en libros",
    subtitleEn: "Signals in books",
    color: "#f9a8d4",
    icon: BookOpen,
  },
  {
    id: "semanticscholar",
    subtitleEs: "Produccion academica",
    subtitleEn: "Academic production",
    color: "#34d399",
    icon: Brain,
  },
  {
    id: "crossref",
    subtitleEs: "Registros DOI",
    subtitleEn: "DOI records",
    color: "#22d3ee",
    icon: Network,
  },
  {
    id: "nyt",
    subtitleEs: "Cobertura mediatica",
    subtitleEn: "Media coverage",
    color: "#f59e0b",
    icon: Newspaper,
  },
];

const FILTER_RANGES: Array<{ value: TimeRange; label: string }> = [
  { value: 2006, label: "2006 - 2026" },
  { value: 2012, label: "2012 - 2026" },
  { value: 2018, label: "2018 - 2026" },
];

const MESSAGES = {
  es: {
    navDemo: "Demo interactiva",
    pill: "STRATA Cultural Intelligence",
    title: "Descubri como una idea nace, crece y conquista el mundo.",
    subtitle:
      "Escribi un concepto y conectamos senales de GitHub, Wikipedia, OpenLibrary, Semantic Scholar, Crossref y NYT para construir una historia temporal completa.",
    placeholder: "Ej: inteligencia artificial, feminismo, cambio climatico",
    search: "Analizar concepto",
    searching: "Analizando...",
    inputLabel: "Concepto a explorar",
    filtersTitle: "Filtros",
    timelineTitle: "Evolucion del interes en el tiempo",
    timelineDesc:
      "Cada curva representa la intensidad normalizada por fuente entre 0 y 100.",
    peaksTitle: "Picos de interes por fuente",
    peaksDesc:
      "Ano y nivel de pico maximo para cada fuente disponible en la consulta.",
    summaryTitle: "Explicacion automatica con IA",
    coverageTitle: "Cobertura total por fuente",
    sampleTitle: "Contrato JSON esperado (frontend -> backend)",
    sourceStatus: "Fuentes activas",
    sourceError: "Fuente temporalmente no disponible",
  },
  en: {
    navDemo: "Interactive demo",
    pill: "STRATA Cultural Intelligence",
    title: "Discover how an idea emerges, grows, and spreads worldwide.",
    subtitle:
      "Type any concept and we connect signals from GitHub, Wikipedia, OpenLibrary, Semantic Scholar, Crossref, and NYT to build a full temporal story.",
    placeholder: "Ex: artificial intelligence, feminism, climate change",
    search: "Analyze concept",
    searching: "Analyzing...",
    inputLabel: "Concept to explore",
    filtersTitle: "Filters",
    timelineTitle: "Interest evolution over time",
    timelineDesc:
      "Each line represents source-normalized intensity between 0 and 100.",
    peaksTitle: "Source peak years",
    peaksDesc:
      "Year and maximum peak level for each source available in the query.",
    summaryTitle: "AI-generated explanation",
    coverageTitle: "Total source coverage",
    sampleTitle: "Expected JSON contract (frontend -> backend)",
    sourceStatus: "Active sources",
    sourceError: "Source temporarily unavailable",
  },
} as const;

const chartAnimation = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const sourceColor = (sourceId: SourceId) => {
  return SOURCES.find((source) => source.id === sourceId)?.color ?? "#93c5fd";
};

const sourceMeta = (sourceId: SourceId) => {
  return SOURCES.find((source) => source.id === sourceId);
};

const sourceLabel = (result: StrataResponse, sourceId: SourceId) => {
  return result.sources.find((source) => source.source === sourceId)?.label ?? sourceId;
};

const buildNarrative = (result: StrataResponse, locale: Locale) => {
  const available = result.sources.filter((source) => source.available);
  const top = [...available]
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 2)
    .map((source) => source.label);

  if (locale === "es") {
    return `STRATA detecta que "${result.query}" muestra una evolucion sostenida entre ${result.yearRange.start} y ${result.yearRange.end}. Las fuentes con mayor traccion son ${top.join(" y ") || "las fuentes disponibles"}, con ${result.meta.sourcesAvailable} fuentes activas y ${result.meta.sourcesFailed} con fallas temporales.`;
  }

  return `STRATA detects that "${result.query}" shows sustained evolution between ${result.yearRange.start} and ${result.yearRange.end}. The strongest traction appears in ${top.join(" and ") || "the available sources"}, with ${result.meta.sourcesAvailable} active sources and ${result.meta.sourcesFailed} temporarily failing sources.`;
};

export function StrataLandingClient() {
  const currentYear = 2026;
  const [locale, setLocale] = useState<Locale>("es");
  const [queryInput, setQueryInput] = useState("inteligencia artificial");
  const [result, setResult] = useState<StrataResponse>(() =>
    buildStrataPreview({
      query: "inteligencia artificial",
      yearStart: 2006,
      yearEnd: currentYear,
    }),
  );
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<TimeRange>(2012);
  const [selectedSources, setSelectedSources] = useState<Record<SourceId, boolean>>({
    github: true,
    wikipedia: true,
    openlibrary: true,
    semanticscholar: true,
    crossref: true,
    nyt: true,
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const text = MESSAGES[locale];

  const selectedAvailableSources = useMemo(() => {
    return result.sources.filter(
      (source) => source.available && selectedSources[source.source],
    );
  }, [result.sources, selectedSources]);

  const timelineData = useMemo(() => {
    const rows = new Map<number, Record<string, number>>();

    selectedAvailableSources.forEach((source) => {
      source.data
        .filter((point) => point.year >= range)
        .forEach((point) => {
          const existing = rows.get(point.year) ?? { year: point.year };
          existing[source.source] = point.normalized;
          rows.set(point.year, existing);
        });
    });

    return [...rows.values()].sort((a, b) => Number(a.year) - Number(b.year));
  }, [selectedAvailableSources, range]);

  const peakChartData = useMemo(() => {
    return selectedAvailableSources.map((source) => {
      const peakPoint =
        source.data.find((point) => point.year === source.peakYear) ?? source.data[0];

      return {
        source: source.label,
        year: source.peakYear,
        intensity: peakPoint?.normalized ?? 0,
        fill: sourceColor(source.source),
      };
    });
  }, [selectedAvailableSources]);

  const coverageData = useMemo(() => {
    return selectedAvailableSources.map((source) => ({
      source: source.label,
      totalCount: source.totalCount,
    }));
  }, [selectedAvailableSources]);

  const narrative = useMemo(() => buildNarrative(result, locale), [result, locale]);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!queryInput.trim()) {
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        query: queryInput,
        yearStart: `${range}`,
        yearEnd: `${currentYear}`,
      });
      const response = await fetch(`/api/strata/preview?${params.toString()}`);
      const payload = (await response.json()) as {
        ok: boolean;
        data?: StrataResponse;
      };

      if (payload.ok && payload.data) {
        setResult(payload.data);
      } else {
        setResult(
          buildStrataPreview({
            query: queryInput,
            yearStart: range,
            yearEnd: currentYear,
          }),
        );
      }
    } catch {
      setResult(
        buildStrataPreview({
          query: queryInput,
          yearStart: range,
          yearEnd: currentYear,
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleSource(source: SourceId) {
    setSelectedSources((prev) => ({
      ...prev,
      [source]: !prev[source],
    }));
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden px-4 pb-16 pt-8 sm:px-8 lg:px-14">
      <div className="bg-grid-strata pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-500/20 blur-[140px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-full px-6 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-accent/80">{text.navDemo}</p>
            <p className="text-sm text-white/90">STRATA</p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setLocale("es")}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-semibold",
                locale === "es" ? "bg-accent text-slate-950" : "text-white/70 hover:text-white",
              )}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-semibold",
                locale === "en" ? "bg-accent text-slate-950" : "text-white/70 hover:text-white",
              )}
            >
              EN
            </button>
          </div>
        </header>

        <section className="glass-panel overflow-hidden rounded-4xl border border-white/10 px-5 py-10 sm:px-10">
          <motion.div
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.1 }}
            className="space-y-7"
          >
            <motion.div variants={chartAnimation} transition={{ duration: 0.45 }}>
              <p className="mb-4 inline-flex rounded-full border border-accent/35 bg-accent/10 px-4 py-1 text-xs uppercase tracking-[0.24em] text-accent">
                {text.pill}
              </p>
              <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {text.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted sm:text-lg">{text.subtitle}</p>
            </motion.div>

            <motion.form
              variants={chartAnimation}
              transition={{ duration: 0.45 }}
              onSubmit={handleSearch}
              className="space-y-5"
            >
              <label htmlFor="strata-query" className="text-xs uppercase tracking-[0.22em] text-white/60">
                {text.inputLabel}
              </label>
              <div className="group relative">
                <Search className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-white/35" />
                <input
                  id="strata-query"
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder={text.placeholder}
                  className="h-20 w-full rounded-[1.9rem] border border-white/15 bg-white/5 pl-16 pr-44 text-base text-white shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none backdrop-blur-xl transition group-hover:bg-white/10 focus:border-accent/70 focus:bg-white/10 sm:text-lg"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="neon-ring absolute right-3 top-1/2 inline-flex h-14 -translate-y-1/2 items-center justify-center gap-2 rounded-[1.1rem] bg-accent px-5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChartSpline className="h-4 w-4" />}
                  {loading ? text.searching : text.search}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <span className="text-xs uppercase tracking-[0.2em] text-white/60">{text.filtersTitle}</span>
                <select
                  value={range}
                  onChange={(event) => setRange(Number(event.target.value) as TimeRange)}
                  className="rounded-xl border border-white/15 bg-transparent px-3 py-2 text-sm text-white outline-none focus:border-accent/60"
                >
                  {FILTER_RANGES.map((item) => (
                    <option key={item.value} value={item.value} className="bg-slate-950">
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-white/55">
                  {text.sourceStatus}: {result.meta.sourcesAvailable} / {result.sources.length}
                </p>
              </div>
            </motion.form>

            <motion.div variants={chartAnimation} transition={{ duration: 0.45 }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.sources.map((source) => {
                const meta = sourceMeta(source.source);
                const Icon = meta?.icon ?? FileText;
                const active = selectedSources[source.source];

                return (
                  <button
                    key={source.source}
                    type="button"
                    onClick={() => toggleSource(source.source)}
                    className={clsx(
                      "group rounded-2xl border px-4 py-4 text-left",
                      !source.available
                        ? "border-red-400/30 bg-red-400/10"
                        : active
                          ? "border-accent/45 bg-accent/10"
                          : "border-white/10 bg-white/5 hover:border-white/30",
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${meta?.color ?? "#93c5fd"}22` }}
                      >
                        <span style={{ color: meta?.color ?? "#93c5fd" }}>
                          <Icon className="h-4 w-4" />
                        </span>
                      </span>
                      <p className="font-medium text-white">{source.label}</p>
                    </div>
                    <p className="text-xs text-muted">
                      {locale === "es" ? meta?.subtitleEs : meta?.subtitleEn}
                    </p>
                    {!source.available ? (
                      <p className="mt-2 text-xs text-red-200">{text.sourceError}</p>
                    ) : null}
                  </button>
                );
              })}
            </motion.div>
          </motion.div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <motion.article
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={chartAnimation}
            transition={{ duration: 0.45 }}
            className="glass-panel rounded-3xl p-6"
          >
            <h2 className="text-xl font-semibold text-white">{text.timelineTitle}</h2>
            <p className="mt-2 text-sm text-muted">{text.timelineDesc}</p>
            <div className="mt-5 h-72">
              {isClient ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="year" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(8,16,32,0.95)",
                        color: "#fff",
                      }}
                    />
                    {selectedAvailableSources.map((source) => (
                      <Line
                        key={source.source}
                        type="monotone"
                        dataKey={source.source}
                        name={source.label}
                        stroke={sourceColor(source.source)}
                        strokeWidth={2.5}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full animate-pulse rounded-2xl border border-white/10 bg-white/5" />
              )}
            </div>
          </motion.article>

          <motion.article
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={chartAnimation}
            transition={{ duration: 0.45 }}
            className="glass-panel rounded-3xl p-6"
          >
            <h2 className="text-xl font-semibold text-white">{text.peaksTitle}</h2>
            <p className="mt-2 text-sm text-muted">{text.peaksDesc}</p>
            <div className="mt-5 h-72">
              {isClient ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakChartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="source" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
                    <Tooltip
                      formatter={(value, _name, item) => [value, `Peak ${item.payload.year}`]}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(8,16,32,0.95)",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="intensity" radius={[10, 10, 0, 0]}>
                      {peakChartData.map((entry) => (
                        <Cell key={`${entry.source}-${entry.year}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full animate-pulse rounded-2xl border border-white/10 bg-white/5" />
              )}
            </div>
            <ul className="mt-4 space-y-2">
              {selectedAvailableSources.map((source) => (
                <li key={source.source} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90">
                  <span className="mr-2 text-accent">{source.peakYear}</span>
                  {source.label}
                </li>
              ))}
            </ul>
          </motion.article>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.article
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={chartAnimation}
            transition={{ duration: 0.45 }}
            className="glass-panel rounded-3xl p-6"
          >
            <h2 className="text-xl font-semibold text-white">{text.summaryTitle}</h2>
            <p className="mt-4 leading-8 text-white/88">{narrative}</p>
          </motion.article>

          <motion.article
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={chartAnimation}
            transition={{ duration: 0.45 }}
            className="glass-panel rounded-3xl p-6"
          >
            <h2 className="text-xl font-semibold text-white">{text.coverageTitle}</h2>
            <div className="mt-5 h-56">
              {isClient ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={coverageData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="source" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(8,16,32,0.95)",
                        color: "#fff",
                      }}
                    />
                    <Area type="monotone" dataKey="totalCount" stroke="#6ee7c8" fill="url(#coverageGradient)" strokeWidth={2} />
                    <defs>
                      <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6ee7c8" stopOpacity={0.7} />
                        <stop offset="100%" stopColor="#6ee7c8" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full animate-pulse rounded-2xl border border-white/10 bg-white/5" />
              )}
            </div>
            <p className="mt-4 text-xs text-white/65">
              fetchedAt: {result.meta.fetchedAt} | durationMs: {result.meta.durationMs}
            </p>
          </motion.article>
        </section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={chartAnimation}
          transition={{ duration: 0.45 }}
          className="glass-panel rounded-3xl p-6"
        >
          <h2 className="text-xl font-semibold text-white">{text.sampleTitle}</h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/60 p-4 font-mono text-xs leading-6 text-cyan-100">
{`GET /api/strata/preview?query=${encodeURIComponent(result.query)}&yearStart=${range}&yearEnd=${result.yearRange.end}

{
  "ok": true,
  "data": {
    "query": "${result.query}",
    "yearRange": { "start": ${result.yearRange.start}, "end": ${result.yearRange.end} },
    "sources": [
      {
        "source": "github",
        "label": "${sourceLabel(result, "github")}",
        "data": [{ "year": ${result.yearRange.end}, "count": 123, "normalized": 87.4 }],
        "totalCount": 4120,
        "peakYear": ${result.yearRange.end - 2},
        "available": true
      }
    ],
    "meta": {
      "fetchedAt": "${result.meta.fetchedAt}",
      "durationMs": ${result.meta.durationMs},
      "sourcesAvailable": ${result.meta.sourcesAvailable},
      "sourcesFailed": ${result.meta.sourcesFailed}
    }
  }
}`}
          </pre>
        </motion.section>
      </div>
    </main>
  );
}
