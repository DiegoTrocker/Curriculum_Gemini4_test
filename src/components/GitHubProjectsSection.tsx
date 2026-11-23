import { useMemo, useState } from 'react';
import { BookOpen, ExternalLink, RefreshCw, Sparkles, X } from 'lucide-react';
import type { FeaturedDemoLink, GitHubRepoItem, GitHubUserProfile } from '../types/portfolio.ts';
import type { LabModuleId } from './three/ProjectLabViewport.tsx';
import { ProjectLabViewport } from './three/ProjectLabViewport.tsx';
import { MarkdownRenderer } from './MarkdownRenderer.tsx';

interface GitHubProjectsSectionProps {
  profile: GitHubUserProfile | null;
  repos: GitHubRepoItem[];
  loading: boolean;
  error: string | null;
  featuredDemos: FeaturedDemoLink[];
  activeLab: LabModuleId;
  onSelectLab: (lab: LabModuleId) => void;
  isDark: boolean;
  onRefreshGitHub: () => void;
}

export function GitHubProjectsSection({
  profile,
  repos,
  loading,
  error,
  featuredDemos,
  activeLab,
  onSelectLab,
  isDark,
  onRefreshGitHub,
}: GitHubProjectsSectionProps) {
  const [languageFilter, setLanguageFilter] = useState('All');

  // README inspector drawer state
  const [readmeRepo, setReadmeRepo] = useState<GitHubRepoItem | null>(null);
  const [readmeContent, setReadmeContent] = useState('');
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [readmeError, setReadmeError] = useState<string | null>(null);

  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of repos) {
      if (r.language) {
        counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
      }
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang);
    return ['All', ...top];
  }, [repos]);

  const filteredRepos = useMemo(() => {
    const list =
      languageFilter === 'All' ? repos : repos.filter((r) => r.language === languageFilter);
    return list.slice(0, 9);
  }, [repos, languageFilter]);

  const openReadme = async (repo: GitHubRepoItem) => {
    setReadmeRepo(repo);
    setReadmeLoading(true);
    setReadmeError(null);
    setReadmeContent('');
    try {
      const res = await fetch(
        `/api/github/readme?repo=${encodeURIComponent(repo.name)}`
      );
      const data = (await res.json()) as { markdown?: string; error?: string };
      if (!res.ok) {
        setReadmeError(data.error || 'Could not load README.');
      } else {
        setReadmeContent(data.markdown || 'Empty README.');
      }
    } catch {
      setReadmeError('Network error while fetching repository README.');
    } finally {
      setReadmeLoading(false);
    }
  };

  const handleSubmitSync = (e: React.FormEvent) => {
    e.preventDefault();
    setLanguageFilter('All');
    onRefreshGitHub();
  };

  return (
    <section id="projects" className="border-t border-zinc-200/80 py-16 dark:border-slate-800/80">
      <div className="flex flex-wrap items-end justify-between gap-6 rounded-2xl border border-zinc-200/80 bg-white/90 p-6 dark:border-slate-800/80 dark:bg-slate-900/88">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400">
            02. GitHub Integration &amp; 3D Project Lab
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Live Repositories &amp; Interactive WebGL Demos
          </h2>
        </div>

        <form onSubmit={handleSubmitSync} className="flex items-center">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync GitHub</span>
          </button>
        </form>
      </div>

      {/* Live GitHub Profile Bar */}
      {profile && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200/90 bg-white/92 px-5 py-3.5 dark:border-slate-800/90 dark:bg-slate-900/90">
          <div className="flex items-center gap-3.5">
            <img
              src={profile.avatar_url}
              alt={`${profile.login} GitHub avatar`}
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-lg border border-zinc-200 object-cover dark:border-slate-700"
            />
            <div>
              <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {profile.name || profile.login}
              </p>
              <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                @{profile.login} · {profile.public_repos} Public Repos · {profile.followers} Followers
              </p>
            </div>
          </div>

          <a
            href={profile.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap shrink-0"
          >
            <span>Open GitHub Profile</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Language Filter Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {languages.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguageFilter(lang)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              languageFilter === lang
                ? 'bg-blue-600 text-white'
                : 'bg-white/90 text-zinc-700 hover:bg-white dark:bg-slate-900/90 dark:text-zinc-300 dark:hover:bg-slate-800'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Live GitHub Repos Grid */}
      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50/95 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/90 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-44 animate-pulse rounded-xl border border-zinc-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80"
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredRepos.map((repo) => {
            const linkedDemo = featuredDemos.find(
              (d) => d.repoName.toLowerCase() === repo.name.toLowerCase()
            );
            const updatedLabel = repo.updated_at
              ? new Date(repo.updated_at).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })
              : 'Recent';

            return (
              <article
                key={repo.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white/92 p-5 transition-colors hover:border-zinc-300 dark:border-slate-800/90 dark:bg-slate-900/90 dark:hover:border-slate-700"
              >
                <div>
                  <p className="font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {repo.language || 'Multi-lang'} · ★ {repo.stargazers_count} · {updatedLabel}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {repo.name}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {repo.description || 'Engineering repository synced live via GitHub REST API.'}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => openReadme(repo)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-800 hover:text-blue-600 dark:text-zinc-200 dark:hover:text-blue-400 whitespace-nowrap shrink-0"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Inspect README</span>
                  </button>

                  {linkedDemo && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectLab(linkedDemo.labPresetId);
                        document.getElementById('project-lab-stage')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>3D Demo</span>
                    </button>
                  )}

                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 whitespace-nowrap shrink-0"
                  >
                    <span>Source</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Embedded Three.js 3D Project Lab Stage */}
      <div
        id="project-lab-stage"
        className="mt-12 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40"
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Interactive WebGL Sandbox
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Three.js Project Lab Viewports
            </h3>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Live shader, instanced kinematics, and playable WebGL mini-game demos running directly in the browser with software-WebGL protection.
          </p>
        </div>

        <ProjectLabViewport activeLab={activeLab} onSelectLab={onSelectLab} isDark={isDark} />
      </div>

      {/* README Inspector Modal */}
      {readmeRepo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${readmeRepo.name} README`}
        >
          <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <div>
                <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {readmeRepo.full_name}
                </p>
                <h4 className="font-display text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  Repository Documentation
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setReadmeRepo(null)}
                aria-label="Close README drawer"
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {readmeLoading && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading README from GitHub...</p>
              )}
              {readmeError && (
                <p className="text-sm text-red-600 dark:text-red-400">{readmeError}</p>
              )}
              {!readmeLoading && !readmeError && <MarkdownRenderer content={readmeContent} />}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
