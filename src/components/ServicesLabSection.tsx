import { useMemo, useState } from 'react';
import { ExternalLink, Layers, Play, Wrench, X } from 'lucide-react';
import type { HostedService, ServiceCategory } from '../types/portfolio.ts';
import { ProjectLabViewport } from './three/ProjectLabViewport.tsx';

interface ServicesLabSectionProps {
  services: HostedService[];
  isDark: boolean;
}

function ServiceThumbnail({ src, alt, name }: { src: string; alt: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-slate-200 via-slate-100 to-blue-50 p-4 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
        <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <p className="font-display text-sm font-semibold text-zinc-800 dark:text-zinc-200">{name}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
    />
  );
}

function DevWorkbenchSandbox() {
  const [toolTab, setToolTab] = useState<'json' | 'regex' | 'jwt'>('json');
  const [jsonInput, setJsonInput] = useState('{"service":"telemetry-edge","latencyMs":12,"healthy":true}');
  const [regexPattern, setRegexPattern] = useState('([a-z]+)-(\\d+)');
  const [regexSample, setRegexSample] = useState('node-104 active, node-208 standby');
  const [jwtInput, setJwtInput] = useState(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWVnbyIsInJvbGUiOiJlbmdpbmVlciIsImlhdCI6MTc5NTQyMDUwMH0.signature'
  );

  const formattedJson = useMemo(() => {
    try {
      return { ok: true, out: JSON.stringify(JSON.parse(jsonInput), null, 2) };
    } catch (err) {
      return { ok: false, out: err instanceof Error ? err.message : 'Invalid JSON' };
    }
  }, [jsonInput]);

  const regexMatches = useMemo(() => {
    try {
      const re = new RegExp(regexPattern, 'g');
      return { ok: true, matches: [...regexSample.matchAll(re)].map((m) => m[0]) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Invalid Regex', matches: [] };
    }
  }, [regexPattern, regexSample]);

  const decodedJwt = useMemo(() => {
    try {
      const parts = jwtInput.trim().split('.');
      if (parts.length < 2) return { ok: false, out: 'Expected header.payload.signature format' };
      const decode = (b64: string) => {
        const norm = b64.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.stringify(JSON.parse(atob(norm)), null, 2);
      };
      return { ok: true, header: decode(parts[0]), payload: decode(parts[1]) };
    } catch {
      return { ok: false, out: 'Could not decode Base64URL JWT segments.' };
    }
  }, [jwtInput]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        {(
          [
            { id: 'json', label: 'JSON Formatter' },
            { id: 'regex', label: 'Regex Tester' },
            { id: 'jwt', label: 'JWT Inspector' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setToolTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              toolTab === t.id
                ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {toolTab === 'json' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-xs text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <pre
            className={`overflow-auto rounded-lg border p-3 font-mono text-xs ${
              formattedJson.ok
                ? 'border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'
                : 'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
            }`}
          >
            {formattedJson.out}
          </pre>
        </div>
      )}

      {toolTab === 'regex' && (
        <div className="space-y-3">
          <input
            type="text"
            value={regexPattern}
            onChange={(e) => setRegexPattern(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            placeholder="Regular expression (flags: g)"
          />
          <textarea
            value={regexSample}
            onChange={(e) => setRegexSample(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900">
            {regexMatches.ok ? (
              <span>
                Matches ({regexMatches.matches.length}):{' '}
                {regexMatches.matches.length > 0 ? regexMatches.matches.join(', ') : 'None'}
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400">{regexMatches.error}</span>
            )}
          </div>
        </div>
      )}

      {toolTab === 'jwt' && (
        <div className="space-y-3">
          <textarea
            value={jwtInput}
            onChange={(e) => setJwtInput(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          {decodedJwt.ok ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <pre className="overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900">
                {decodedJwt.header}
              </pre>
              <pre className="overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900">
                {decodedJwt.payload}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-red-600 dark:text-red-400">{decodedJwt.out}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function ServicesLabSection({ services, isDark }: ServicesLabSectionProps) {
  const [filter, setFilter] = useState<'all' | ServiceCategory>('all');
  const [activeToolModal, setActiveToolModal] = useState<HostedService | null>(null);

  const visible =
    filter === 'all' ? services : services.filter((s) => s.category === filter);

  const handleLaunch = (srv: HostedService) => {
    if (srv.embedMode === 'native-lab' || srv.embedMode === 'iframe') {
      setActiveToolModal(srv);
    }
  };

  return (
    <section id="services" className="border-t border-zinc-200/80 py-16 dark:border-slate-800/80">
      <div className="flex flex-wrap items-end justify-between gap-6 rounded-2xl border border-zinc-200/80 bg-white/90 p-6 dark:border-slate-800/80 dark:bg-slate-900/88">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400">
            03. Self-Hosted Services, Mini-Games &amp; Utilities
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Interactive Tools &amp; Hosted Infrastructure
          </h2>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-slate-800">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'mini-game', label: 'Mini-Games' },
              { id: 'utility', label: 'Utilities' },
              { id: 'service', label: 'Services' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white text-zinc-950 shadow-xs dark:bg-slate-800 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {visible.map((srv) => (
          <article
            key={srv.id}
            className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/90"
          >
            <div className="aspect-[4/3] w-full overflow-hidden border-b border-zinc-200 dark:border-slate-800">
              <ServiceThumbnail
                src={srv.coverImageUrl}
                alt={`${srv.name} preview`}
                name={srv.name}
              />
            </div>

            <div className="flex flex-1 flex-col justify-between p-6">
              <div>
                <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {srv.category} · {srv.hostLabel}
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {srv.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {srv.description}
                </p>
                {srv.techStack.length > 0 && (
                  <p className="mt-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {srv.techStack.join(' · ')}
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4 dark:border-slate-800">
                {srv.embedMode !== 'external-only' && (
                  <button
                    type="button"
                    onClick={() => handleLaunch(srv)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0"
                  >
                    {srv.category === 'mini-game' ? (
                      <Play className="h-3.5 w-3.5" />
                    ) : (
                      <Wrench className="h-3.5 w-3.5" />
                    )}
                    <span>{srv.category === 'mini-game' ? 'Play Sandbox' : 'Open Utility'}</span>
                  </button>
                )}

                <a
                  href={srv.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3.5 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-slate-700 dark:text-zinc-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <span>Open Host URL</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Embedded Utility / Iframe Sandbox Modal */}
      {activeToolModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeToolModal.name}
        >
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-slate-800">
              <div>
                <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {activeToolModal.hostLabel}
                </p>
                <h4 className="font-display text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {activeToolModal.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveToolModal(null)}
                aria-label="Close utility modal"
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-slate-900 dark:hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {activeToolModal.nativeLabId === 'dev-workbench' ? (
                <DevWorkbenchSandbox />
              ) : activeToolModal.nativeLabId === 'vector-dodge' ? (
                <ProjectLabViewport activeLab="vector-dodge" onSelectLab={() => {}} isDark={isDark} />
              ) : (
                <iframe
                  src={activeToolModal.externalUrl}
                  title={activeToolModal.name}
                  className="h-[62vh] w-full rounded-lg border border-zinc-200 dark:border-slate-800"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
