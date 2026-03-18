"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
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
    navDemo: "Modo ejecutivo",
    navLive: "Vista de datos en vivo",
    pill: "STRATA Cultural Intelligence Platform",
    title: "Modela como una narrativa cultural se expande, acelera y domina la conversacion global.",
    subtitle:
      "Escribi un concepto estrategico y correlacionamos senales de GitHub, Wikipedia, OpenLibrary, Semantic Scholar, Crossref y NYT para entregar contexto temporal accionable.",
    placeholder: "Ej: inteligencia artificial, salud digital, transicion energetica",
    search: "Ejecutar analisis",
    searching: "Analizando...",
    inputLabel: "Concepto estrategico",
    filtersTitle: "Ventana de analisis",
    timelineTitle: "Evolucion de interes multifuente",
    timelineDesc:
      "Cada curva refleja intensidad normalizada por fuente entre 0 y 100 para lectura comparativa.",
    peaksTitle: "Picos de traccion por fuente",
    peaksDesc:
      "Ano y nivel de maximo impacto para cada fuente habilitada en la consulta.",
    summaryTitle: "Sintesis ejecutiva asistida por IA",
    coverageTitle: "Cobertura agregada por fuente",
    sampleTitle: "Contrato JSON de integracion (frontend -> backend)",
    sourceStatus: "Fuentes habilitadas",
    sourceError: "Fuente con indisponibilidad temporal",
  },
  en: {
    navDemo: "Executive mode",
    navLive: "Live data preview",
    pill: "STRATA Cultural Intelligence Platform",
    title: "Model how a cultural narrative emerges, accelerates, and dominates the global conversation.",
    subtitle:
      "Type a strategic concept and we correlate signals from GitHub, Wikipedia, OpenLibrary, Semantic Scholar, Crossref, and NYT to deliver actionable temporal context.",
    placeholder: "Ex: artificial intelligence, digital health, energy transition",
    search: "Run analysis",
    searching: "Analyzing...",
    inputLabel: "Strategic concept",
    filtersTitle: "Analysis window",
    timelineTitle: "Cross-source interest evolution",
    timelineDesc:
      "Each line reflects source-normalized intensity between 0 and 100 for clear comparison.",
    peaksTitle: "Source traction peaks",
    peaksDesc:
      "Year and maximum impact level for every source enabled in the query.",
    summaryTitle: "AI-assisted executive summary",
    coverageTitle: "Aggregate source coverage",
    sampleTitle: "Integration JSON contract (frontend -> backend)",
    sourceStatus: "Enabled sources",
    sourceError: "Source temporarily unavailable",
  },
} as const;

const chartAnimation = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

type RevealBandProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  sectionId?: string;
  parallaxDistance?: number;
  revealDuration?: number;
  revealDelay?: number;
  revealAmount?: number;
};

function RevealBand({
  children,
  className,
  contentClassName,
  sectionId,
  parallaxDistance = 10,
  revealDuration = 0.55,
  revealDelay = 0,
  revealAmount = 0.3,
}: RevealBandProps) {
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const parallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : [parallaxDistance, -parallaxDistance],
  );

  return (
    <motion.section
      id={sectionId}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: revealAmount }}
      variants={chartAnimation}
      transition={{
        duration: prefersReducedMotion ? 0.1 : revealDuration,
        delay: prefersReducedMotion ? 0 : revealDelay,
        ease: "easeOut",
      }}
      className={clsx("strata-band", className)}
      style={{ y: parallaxY }}
    >
      <div className={clsx("strata-shell", contentClassName)}>{children}</div>
    </motion.section>
  );
}

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
    return `STRATA detecta que "${result.query}" mantiene una curva de crecimiento sostenida entre ${result.yearRange.start} y ${result.yearRange.end}. La traccion principal aparece en ${top.join(" y ") || "las fuentes habilitadas"}, con ${result.meta.sourcesAvailable} fuentes operativas y ${result.meta.sourcesFailed} con degradacion temporal.`;
  }

  return `STRATA detects that "${result.query}" sustains a growth curve between ${result.yearRange.start} and ${result.yearRange.end}. Primary traction appears in ${top.join(" and ") || "the enabled sources"}, with ${result.meta.sourcesAvailable} operational sources and ${result.meta.sourcesFailed} temporarily degraded sources.`;
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
  const [activeStoryId, setActiveStoryId] = useState("story-hero");
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

  useEffect(() => {
    const sectionIds = [
      "story-hero",
      "story-sources",
      "story-timeline",
      "story-peaks",
      "story-narrative",
      "story-contract",
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActiveStoryId(visible[0].target.id);
        }
      },
      {
        threshold: [0.22, 0.35, 0.55],
        rootMargin: "-18% 0px -46% 0px",
      },
    );

    sectionIds.forEach((id) => {
      const node = document.getElementById(id);
      if (node) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, []);

  const text = MESSAGES[locale];
  const sectionLabel =
    locale === "es"
      ? {
          sources: "Seccion 01 · Orquestacion de fuentes",
          timeline: "Seccion 02 · Evolucion temporal",
          peaks: "Seccion 03 · Intensidad y maximos",
          narrative: "Seccion 04 · Sintesis ejecutiva",
          contract: "Seccion 05 · Integracion API",
        }
      : {
          sources: "Section 01 · Source orchestration",
          timeline: "Section 02 · Temporal evolution",
          peaks: "Section 03 · Intensity and peaks",
          narrative: "Section 04 · Executive summary",
          contract: "Section 05 · API integration",
        };

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

  const totalCoverage = useMemo(() => {
    return selectedAvailableSources.reduce((acc, source) => acc + source.totalCount, 0);
  }, [selectedAvailableSources]);

  const maxIntensity = useMemo(() => {
    return peakChartData.reduce((max, row) => Math.max(max, row.intensity), 0);
  }, [peakChartData]);

  const topSource = useMemo(() => {
    return [...selectedAvailableSources].sort((a, b) => b.totalCount - a.totalCount)[0]?.label;
  }, [selectedAvailableSources]);

  const storylineItems =
    locale === "es"
      ? [
          { id: "story-hero", label: "Briefing" },
          { id: "story-sources", label: "Fuentes" },
          { id: "story-timeline", label: "Evolucion" },
          { id: "story-peaks", label: "Picos" },
          { id: "story-narrative", label: "Sintesis" },
          { id: "story-contract", label: "API" },
        ]
      : [
          { id: "story-hero", label: "Briefing" },
          { id: "story-sources", label: "Sources" },
          { id: "story-timeline", label: "Evolution" },
          { id: "story-peaks", label: "Peaks" },
          { id: "story-narrative", label: "Summary" },
          { id: "story-contract", label: "API" },
        ];

  const kpiText =
    locale === "es"
      ? {
          navAria: "Navegacion data storyline",
          sources: "Fuentes operativas",
          coverage: "Cobertura total",
          peak: "Pico de intensidad",
          latency: "Latencia",
          leadSource: "Fuente lider",
        }
      : {
          navAria: "Data storyline navigation",
          sources: "Operational sources",
          coverage: "Total coverage",
          peak: "Peak intensity",
          latency: "Latency",
          leadSource: "Lead source",
        };

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
    <main className="relative isolate min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 bg-grid-strata opacity-35" />
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-cyan-300/15 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-[38%] h-105 w-105 rounded-full bg-emerald-300/12 blur-[150px]" />
      <div className="pointer-events-none absolute -bottom-16 left-[20%] h-105 w-105 rounded-full bg-blue-400/12 blur-[150px]" />

      <nav className="storyline-rail" aria-label={kpiText.navAria}>
        <div className="storyline-rail-line" />
        <ul className="space-y-4">
          {storylineItems.map((item, index) => {
            const active = activeStoryId === item.id;
            return (
              <li key={item.id}>
                <a href={`#${item.id}`} className={clsx("storyline-node", active && "storyline-node--active")}>
                  <span className="storyline-node-dot" aria-hidden="true" />
                  <span className="storyline-node-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="storyline-node-label">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="strata-band strata-band--nav">
        <div className="strata-shell py-4">
          <div className="strata-nav-panel flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-accent/80">{text.navDemo}</p>
              <p className="mt-1 text-sm text-white/90">STRATA Intelligence Layer</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="strata-data-chip hidden lg:inline-flex">{text.navLive}</span>
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1">
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
            </div>
          </div>
        </div>
      </section>

      <RevealBand
        sectionId="story-hero"
        className="strata-band--hero"
        contentClassName="space-y-8 py-14 sm:py-16"
        parallaxDistance={14}
        revealDuration={0.7}
        revealAmount={0.25}
      >
        <motion.div initial="hidden" animate="show" transition={{ staggerChildren: 0.12 }} className="space-y-8">
          <motion.div variants={chartAnimation} transition={{ duration: 0.5 }}>
            <p className="mb-5 inline-flex rounded-full border border-accent/30 bg-accent/10 px-4 py-1 text-xs uppercase tracking-[0.24em] text-accent">
              {text.pill}
            </p>
            <h1 className="strata-title-gradient max-w-5xl text-balance text-[clamp(2.05rem,4.8vw,5rem)] font-semibold leading-[1.04] tracking-tight">
              {text.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/72 sm:text-lg">{text.subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="strata-data-chip">{result.meta.sourcesAvailable} active sources</span>
              <span className="strata-data-chip">range {range} - {currentYear}</span>
              <span className="strata-data-chip">updated {result.meta.fetchedAt}</span>
            </div>
          </motion.div>

          <motion.form
            variants={chartAnimation}
            transition={{ duration: 0.5 }}
            onSubmit={handleSearch}
            className="space-y-5"
          >
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="strata-query" className="text-xs uppercase tracking-[0.22em] text-white/60">
                {text.inputLabel}
              </label>
              <span
                className={clsx(
                  "font-mono text-[0.65rem] uppercase tracking-[0.18em] transition-colors duration-200",
                  queryInput.trim() ? "text-accent/80" : "text-white/38",
                )}
              >
                {locale === "es" ? (queryInput.trim() ? "Listo" : "Requerido") : (queryInput.trim() ? "Ready" : "Required")}
              </span>
            </div>
            <div className="group relative">
              <Search className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-white/40 transition-[color,filter] duration-200 group-hover:text-accent/80 group-hover:drop-shadow-[0_0_8px_rgba(125,211,252,0.25)]" />
              <input
                id="strata-query"
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder={text.placeholder}
                className="h-20 w-full rounded-[1.9rem] border border-white/15 bg-white/5 pl-16 pr-6 text-base text-white shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-200 ease-out group-hover:bg-white/12 group-hover:border-white/30 group-hover:shadow-[0_0_20px_rgba(34,212,238,0.15)] focus:border-[rgba(110,231,200,0.72)] focus:bg-white/14 focus:shadow-[0_0_24px_rgba(110,231,200,0.22)] sm:pr-44 sm:text-lg"
              />
              <button
                type="submit"
                disabled={loading}
                className="neon-ring mt-4 inline-flex h-14 items-center justify-center gap-2 rounded-[1.1rem] bg-accent px-6 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-65 sm:absolute sm:right-3 sm:top-1/2 sm:mt-0 sm:h-14 sm:-translate-y-1/2"
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
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-[border-color,background-color,box-shadow] duration-200 focus:border-accent/70 focus:bg-white/8 focus:shadow-[inset_0_0_12px_rgba(110,231,200,0.08)]"
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

          <motion.section variants={chartAnimation} transition={{ duration: 0.5 }} className="strata-kpi-ribbon mt-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <article className="strata-kpi-card">
                <p className="strata-kpi-label">{kpiText.sources}</p>
                <p className="strata-kpi-value">{result.meta.sourcesAvailable}</p>
                <p className="strata-kpi-meta">{kpiText.leadSource}: {topSource ?? "n/a"}</p>
              </article>
              <article className="strata-kpi-card">
                <p className="strata-kpi-label">{kpiText.coverage}</p>
                <p className="strata-kpi-value">{totalCoverage.toLocaleString()}</p>
                <p className="strata-kpi-meta">{selectedAvailableSources.length} sources</p>
              </article>
              <article className="strata-kpi-card">
                <p className="strata-kpi-label">{kpiText.peak}</p>
                <p className="strata-kpi-value">{maxIntensity.toFixed(1)}</p>
                <p className="strata-kpi-meta">0 - 100 normalized</p>
              </article>
              <article className="strata-kpi-card">
                <p className="strata-kpi-label">{kpiText.latency}</p>
                <p className="strata-kpi-value">{result.meta.durationMs}ms</p>
                <p className="strata-kpi-meta">fetchedAt {result.meta.fetchedAt}</p>
              </article>
            </div>
          </motion.section>
        </motion.div>
      </RevealBand>

      <RevealBand
        sectionId="story-sources"
        className="strata-band--sources"
        contentClassName="py-12 sm:py-16"
        parallaxDistance={10}
        revealDuration={0.58}
        revealDelay={0.02}
      >
        <div className="mb-7">
          <p className="strata-kicker">{sectionLabel.sources}</p>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{text.sourceStatus}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70 sm:text-base">
            {locale === "es"
              ? "Activa o desactiva fuentes para controlar como se construye cada visualizacion en tiempo real."
              : "Toggle sources to control how every visualization is computed in real time."}
          </p>
          <div className="strata-subtle-rule" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  "group rounded-2xl border px-4 py-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5",
                  !source.available
                    ? "border-red-400/30 bg-red-400/10"
                    : active
                      ? "border-accent/45 bg-accent/10"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/7 hover:shadow-[0_12px_24px_rgba(0,0,0,0.22)]",
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
                <p className="text-xs text-muted">{locale === "es" ? meta?.subtitleEs : meta?.subtitleEn}</p>
                {!source.available ? <p className="mt-2 text-xs text-red-200">{text.sourceError}</p> : null}
              </button>
            );
          })}
        </div>
      </RevealBand>

      <RevealBand
        sectionId="story-timeline"
        className="strata-band--timeline"
        contentClassName="py-12 sm:py-16"
        parallaxDistance={12}
        revealDuration={0.62}
        revealDelay={0.04}
      >
        <div className="grid gap-7 lg:grid-cols-[0.35fr_0.65fr] lg:items-start">
          <div>
            <p className="strata-kicker">{sectionLabel.timeline}</p>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{text.timelineTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">{text.timelineDesc}</p>
            <div className="strata-subtle-rule" />
          </div>

          <div className="strata-premium-card rounded-3xl p-4 sm:p-6">
            <div className="strata-chart-frame-timeline">
              {isClient ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="year" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
                    <Tooltip
                      cursor={{
                        stroke: "rgba(125, 211, 252, 0.65)",
                        strokeWidth: 1.3,
                        strokeDasharray: "4 5",
                        fill: "rgba(125, 211, 252, 0.08)",
                      }}
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
          </div>
        </div>
      </RevealBand>

      <RevealBand
        sectionId="story-peaks"
        className="strata-band--peaks"
        contentClassName="py-12 sm:py-16"
        parallaxDistance={10}
        revealDuration={0.62}
        revealDelay={0.06}
      >
        <div className="grid gap-7 lg:grid-cols-[0.65fr_0.35fr] lg:items-start">
          <div className="strata-premium-card rounded-3xl p-4 sm:p-6">
            <p className="strata-kicker">{sectionLabel.peaks}</p>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{text.peaksTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">{text.peaksDesc}</p>
            <div className="strata-subtle-rule" />

            <div className="mt-6 strata-chart-frame-secondary">
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
          </div>

          <ul className="space-y-2">
            {selectedAvailableSources.map((source) => (
              <li key={source.source} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/90 backdrop-blur-sm">
                <span className="mr-2 text-accent">{source.peakYear}</span>
                {source.label}
              </li>
            ))}
          </ul>
        </div>
      </RevealBand>

      <RevealBand
        sectionId="story-narrative"
        className="strata-band--narrative"
        contentClassName="grid gap-6 py-12 sm:py-16 lg:grid-cols-[1fr_0.75fr]"
        parallaxDistance={8}
        revealDuration={0.56}
        revealDelay={0.08}
      >
        <article className="strata-premium-card rounded-3xl p-5 sm:p-6">
          <p className="strata-kicker">{sectionLabel.narrative}</p>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{text.summaryTitle}</h2>
          <p className="mt-5 leading-8 text-white/88">{narrative}</p>
        </article>

        <article className="strata-premium-card rounded-3xl p-5 sm:p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{text.coverageTitle}</h2>
          <div className="mt-5 h-60 sm:h-70">
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
          <p className="mt-4 font-mono text-xs text-white/70">
            fetchedAt: {result.meta.fetchedAt} | durationMs: {result.meta.durationMs}
          </p>
        </article>
      </RevealBand>

      <RevealBand
        sectionId="story-contract"
        className="strata-band--contract"
        contentClassName="py-12 sm:py-16"
        parallaxDistance={6}
        revealDuration={0.52}
        revealDelay={0.1}
      >
        <p className="strata-kicker">{sectionLabel.contract}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{text.sampleTitle}</h2>
        <div className="strata-subtle-rule" />
        <pre className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4 font-mono text-xs leading-6 text-cyan-100 sm:p-6">
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
      </RevealBand>
    </main>
  );
}
