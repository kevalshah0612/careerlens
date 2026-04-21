import { useState, useMemo } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { jobsApi, type Job } from './api/client';
import './index.css';

const queryClient = new QueryClient();

// ─── Constants ────────────────────────────────────────────────────────────────

const HOURS_LIMIT = 36;

const SOURCE_CONFIG: Record<string, { label: string; badgeClass: string; borderClass: string }> = {
  greenhouse:    { label: 'GH', badgeClass: 'bg-green-100 text-green-800',   borderClass: 'border-l-green-500'  },
  lever:         { label: 'LV', badgeClass: 'bg-blue-100 text-blue-800',     borderClass: 'border-l-blue-500'   },
  ashby:         { label: 'AB', badgeClass: 'bg-purple-100 text-purple-800', borderClass: 'border-l-purple-500' },
  google_alerts: { label: 'GA', badgeClass: 'bg-orange-100 text-orange-800', borderClass: 'border-l-orange-400' },
};

const FILTER_OPTIONS = [
  { key: 'all',           label: 'All'        },
  { key: 'remote',        label: 'Remote'     },
  { key: 'h1b',           label: 'H1B'        },
  { key: 'greenhouse',    label: 'Greenhouse' },
  { key: 'lever',         label: 'Lever'      },
  { key: 'ashby',         label: 'Ashby'      },
  { key: 'google_alerts', label: 'GA Alerts'  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function isWithinLimit(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() <= HOURS_LIMIT * 3600000;
}

function getSourceConfig(source: string) {
  return SOURCE_CONFIG[source] ?? {
    label: '??',
    badgeClass: 'bg-gray-100 text-gray-600',
    borderClass: 'border-l-gray-400',
  };
}

// ─── JobCard ──────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: Job }) {
  const [expanded, setExpanded] = useState(false);
  const src = getSourceConfig(job.source);

  return (
    <div className={`
      bg-white border border-gray-100 border-l-4 ${src.borderClass}
      rounded-xl overflow-hidden
      transition-all duration-150
      hover:border-gray-200 hover:shadow-sm
    `}>

      {/* ── Main row - always visible ─────────────────────────── */}
      <div className="flex items-start gap-4 px-5 py-4">

        {/* Left side: all job info */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setExpanded(v => !v)}
        >
          {/* Badge + Title */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`
              font-mono text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0
              ${src.badgeClass}
            `}>
              {src.label}
            </span>
            <h3 className="text-[15px] font-semibold text-gray-900 leading-snug">
              {job.title}
            </h3>
          </div>

          {/* Company · Location · Time */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="font-mono text-xs font-medium text-gray-600">
              {job.company}
            </span>
            <span className="text-gray-300 text-xs">·</span>
            <span className="text-xs text-gray-400">
              {job.location || 'United States'}
            </span>
            <span className="text-gray-300 text-xs">·</span>
            <span className="font-mono text-[11px] text-gray-400">
              {timeAgo(job.postedAt)}
            </span>
          </div>

          {/* Tags */}
          <div className="flex gap-1.5 flex-wrap">
            {job.remote && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                remote
              </span>
            )}
            {job.visaSponsorship && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                h1b
              </span>
            )}
            {job.experienceLevel && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                {job.experienceLevel}
              </span>
            )}
            {(job.requiredSkills ?? []).slice(0, 5).map((skill, i) => (
              <span
                key={i}
                className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100"
              >
                {skill}
              </span>
            ))}
            {(job.requiredSkills ?? []).length > 5 && (
              <span className="font-mono text-[10px] text-gray-400 self-center">
                +{job.requiredSkills.length - 5}
              </span>
            )}
          </div>
        </div>

        {/* Right side: Apply button + JD toggle - ALWAYS VISIBLE */}
        <div className="flex flex-col items-end gap-2.5 flex-shrink-0">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="
              inline-flex items-center gap-1.5
              px-4 py-2 rounded-lg
              bg-gray-900 hover:bg-gray-700
              text-white text-xs font-semibold
              transition-colors duration-150
              whitespace-nowrap
            "
          >
            Apply ↗
          </a>

          <button
            onClick={() => setExpanded(v => !v)}
            className="
              flex items-center gap-1 font-mono text-[11px]
              text-gray-400 hover:text-gray-600
              transition-colors duration-150
            "
          >
            <span className={`
              transition-transform duration-200 inline-block
              ${expanded ? 'rotate-180' : ''}
            `}>▾</span>
            {expanded ? 'hide JD' : 'view JD'}
          </button>
        </div>
      </div>

      {/* ── Expandable JD ─────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/60">
          {job.description ? (
            <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">
              No description stored for this role. Click Apply to view the full listing.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar() {
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: jobsApi.getStats,
  });

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Total Jobs',   value: stats.total,       color: 'text-gray-900'   },
        { label: 'Last 24h',     value: stats.last24h,     color: 'text-green-600'  },
        { label: 'Remote',       value: stats.remote,      color: 'text-blue-600'   },
        { label: 'H1B Sponsors', value: stats.h1bSponsors, color: 'text-purple-600' },
      ].map(stat => (
        <div key={stat.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
          <p className={`text-2xl font-bold ${stat.color}`}>
            {stat.value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Job Feed ─────────────────────────────────────────────────────────────────

function JobFeed() {
  const [search, setSearch]             = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['jobs-feed'],
    queryFn: () => jobsApi.getJobs({ page: 1, limit: 100 }),
    refetchInterval: 60 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });

  const allJobs: Job[] = data?.jobs ?? [];

  const filtered = useMemo(() => {
    return allJobs.filter(job => {
      if (!isWithinLimit(job.postedAt)) return false;
      if (activeFilter === 'remote' && !job.remote) return false;
      if (activeFilter === 'h1b' && !job.visaSponsorship) return false;
      if (['greenhouse', 'lever', 'ashby', 'google_alerts'].includes(activeFilter)) {
        if (job.source !== activeFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [job.title, job.company, job.location, ...(job.requiredSkills ?? [])]
          .join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allJobs, activeFilter, search]);

  const remoteCount = filtered.filter(j => j.remote).length;
  const h1bCount    = filtered.filter(j => j.visaSponsorship).length;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div>
      {/* Search + filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, company, skill..."
          className="
            w-full px-3 py-2.5 text-sm rounded-lg mb-3
            border border-gray-200 bg-gray-50
            text-gray-900 placeholder-gray-400
            focus:outline-none focus:border-gray-300
          "
        />
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setActiveFilter(opt.key)}
              className={`
                px-3 py-1.5 rounded-full text-xs border font-medium
                transition-all duration-100
                ${activeFilter === opt.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count + Refresh */}
      {!isLoading && !isError && (
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="font-mono text-xs text-gray-400">
            <span className="text-gray-700 font-semibold">{filtered.length}</span> jobs · last {HOURS_LIMIT}h
            {remoteCount > 0 && <> · <span className="text-green-600">{remoteCount} remote</span></>}
            {h1bCount > 0 && <> · <span className="text-blue-600">{h1bCount} h1b</span></>}
          </p>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="font-mono text-[10px] text-gray-300">
                updated {lastUpdated}
              </span>
            )}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                border border-gray-200 text-xs font-medium
                text-gray-500 bg-white
                hover:border-gray-300 hover:text-gray-700
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150
              "
            >
              <span className={isFetching ? 'animate-spin inline-block' : ''}>↻</span>
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            <span className="font-mono text-xs text-gray-400">fetching jobs...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="text-center py-20">
          <p className="text-sm text-red-500 font-medium">Failed to load jobs.</p>
          <p className="text-xs text-gray-400 mt-1">Make sure the backend is running on port 3000.</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <p className="font-mono text-sm text-gray-400">
            {allJobs.length === 0
              ? 'No jobs yet. Worker may still be fetching.'
              : `No jobs in the last ${HOURS_LIMIT}h matching your filters.`
            }
          </p>
        </div>
      )}

      {/* Jobs */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="flex flex-col gap-2">
          {filtered.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-gray-900">JobPulse</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500">
              SWE · Entry / Mid
            </span>
          </div>
          <span className="text-xs text-gray-400">Built by Keval Shah</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        <StatsBar />
        <JobFeed />
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-8 text-center">
        <p className="font-mono text-xs text-gray-300">
          LLM skill extraction · semantic search · multi-tenant architecture
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}