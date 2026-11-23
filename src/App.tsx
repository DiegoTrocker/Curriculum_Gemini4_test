import { useCallback, useEffect, useState } from 'react';
import { ArrowDownRight, Moon, Sun } from 'lucide-react';
import { SEED_PORTFOLIO } from './data/seedPortfolio.ts';
import type {
  ContentEntry,
  GitHubRepoItem,
  GitHubUserProfile,
  PortfolioStore,
} from './types/portfolio.ts';
import { AmbientScrollScene } from './components/three/AmbientScrollScene.tsx';
import { CurriculumSection } from './components/CurriculumSection.tsx';
import { GitHubProjectsSection } from './components/GitHubProjectsSection.tsx';
import { ServicesLabSection } from './components/ServicesLabSection.tsx';
import { BlogDocsSection } from './components/BlogDocsSection.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { GeminiChatDrawer } from './components/GeminiChatDrawer.tsx';

function getInitialDarkPreference(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = window.localStorage.getItem('portfolio_theme');
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function getSlugFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/(?:blog|docs)\/([a-zA-Z0-9-]+)$/);
  return match ? match[1] : null;
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(getInitialDarkPreference);
  const [store, setStore] = useState<PortfolioStore>(SEED_PORTFOLIO);
  const [portraitFailed, setPortraitFailed] = useState(false);

  const isAdminRoute =
    typeof window !== 'undefined' && window.location.pathname === '/admin';

  // Live GitHub API State
  const [githubProfile, setGithubProfile] = useState<GitHubUserProfile | null>(null);
  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [githubLoading, setGithubLoading] = useState(true);
  const [githubError, setGithubError] = useState<string | null>(null);

  // Active View / Drawer State
  const [activeLab, setActiveLab] = useState<'wave-terrain' | 'orbital-swarm' | 'vector-dodge'>(
    'wave-terrain'
  );
  const [selectedSlug, setSelectedSlug] = useState<string | null>(getSlugFromLocation);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      window.localStorage.setItem('portfolio_theme', 'dark');
    } else {
      root.classList.remove('dark');
      window.localStorage.setItem('portfolio_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const onPopState = () => {
      setSelectedSlug(getSlugFromLocation());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const syncGitHub = useCallback(async () => {
    setGithubLoading(true);
    setGithubError(null);
    try {
      const [profRes, reposRes] = await Promise.all([
        fetch('/api/github/profile'),
        fetch('/api/github/repos'),
      ]);
      const profData = await profRes.json();
      const reposData = await reposRes.json();

      if (!profRes.ok) {
        setGithubProfile(null);
        setGithubError(profData.error || 'Unable to load GitHub profile.');
      } else {
        setGithubProfile(profData as GitHubUserProfile);
      }

      if (!reposRes.ok || !Array.isArray(reposData)) {
        setRepos([]);
        setGithubError(reposData.error || 'Unable to load GitHub repositories.');
      } else {
        setRepos(reposData as GitHubRepoItem[]);
      }
    } catch {
      setGithubError('Network error while connecting to GitHub API proxy.');
    } finally {
      setGithubLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/portfolio');
        if (res.ok) {
          const data = (await res.json()) as PortfolioStore;
          if (active) {
            setStore(data);
            if (!isAdminRoute) {
              void syncGitHub();
            }
            return;
          }
        }
      } catch {
        // Keep seeded data if server offline
      }
      if (active && !isAdminRoute) {
        void syncGitHub();
      }
    })();
    return () => {
      active = false;
    };
  }, [syncGitHub, isAdminRoute]);

  const handleSelectPost = (post: ContentEntry | null) => {
    if (post) {
      const path = `/${post.kind === 'doc' ? 'docs' : 'blog'}/${post.slug}`;
      window.history.pushState({}, '', path);
      document.title = post.seoTitle || `${post.title} — ${store.profile.name}`;
      setSelectedSlug(post.slug);
    } else {
      window.history.pushState({}, '', '/');
      document.title = `${store.profile.name} — ${store.profile.role}`;
      setSelectedSlug(null);
    }
  };

  // Separate Private /admin Site
  if (isAdminRoute) {
    return (
      <div className="relative min-h-screen text-zinc-950 dark:text-zinc-100">
        <AmbientScrollScene isDark={isDark} />
        <AdminPortal
          store={store}
          onPortfolioChanged={(next) => {
            setStore(next);
          }}
        />
      </div>
    );
  }

  // Public Read-Only Portfolio Experience
  return (
    <div className="relative min-h-screen text-zinc-950 transition-colors dark:text-zinc-100">
      {/* Scroll-Reactive Moving Three.js 3D Background */}
      <AmbientScrollScene isDark={isDark} />

      {/* Strict 3-Zone Top Bar Contract (No backdrop-filter over WebGL) */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/90 bg-white/95 dark:border-slate-800/90 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50 whitespace-nowrap shrink-0"
          >
            {store.profile.name}
          </a>

          <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400 md:flex">
            <a
              href="#curriculum"
              className="underline-offset-4 hover:text-zinc-950 hover:underline dark:hover:text-zinc-50 whitespace-nowrap shrink-0"
            >
              Curriculum
            </a>
            <a
              href="#projects"
              className="underline-offset-4 hover:text-zinc-950 hover:underline dark:hover:text-zinc-50 whitespace-nowrap shrink-0"
            >
              GitHub &amp; Lab
            </a>
            <a
              href="#services"
              className="underline-offset-4 hover:text-zinc-950 hover:underline dark:hover:text-zinc-50 whitespace-nowrap shrink-0"
            >
              Tools &amp; Games
            </a>
            <a
              href="#blog"
              className="underline-offset-4 hover:text-zinc-950 hover:underline dark:hover:text-zinc-50 whitespace-nowrap shrink-0"
            >
              Blog &amp; Docs
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0"
            >
              Ask Assistant
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="relative z-10 mx-auto max-w-[1240px] px-6">
        {/* Editorial Swiss Grid Hero over Moving 3D Ambient Background */}
        <section className="py-12 lg:py-16">
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white/88 p-7 sm:p-9 dark:border-slate-800/80 dark:bg-slate-900/86">
            <div>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 dark:border-slate-700 dark:bg-slate-800">
                  {!portraitFailed && store.profile.portraitUrl ? (
                    <img
                      src={store.profile.portraitUrl}
                      alt={store.profile.name}
                      referrerPolicy="no-referrer"
                      onError={() => setPortraitFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-zinc-700 dark:text-zinc-300">
                      {store.profile.name
                        .split(' ')
                        .map((p) => p[0])
                        .join('')}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    {store.profile.role}
                  </p>
                  <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {store.profile.location} · {store.profile.availability}
                  </p>
                </div>
              </div>

              <h1 className="mt-8 max-w-4xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
                {store.profile.headline}
              </h1>

              <p className="mt-5 max-w-[65ch] text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                {store.profile.bio}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 pt-4">
              <a
                href="#projects"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 whitespace-nowrap shrink-0"
              >
                <span>Explore GitHub &amp; 3D Lab</span>
                <ArrowDownRight className="h-3.5 w-3.5" />
              </a>

              <a
                href="#curriculum"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <span>View Curriculum</span>
              </a>

              <button
                type="button"
                onClick={() => setIsDark((d) => !d)}
                aria-label="Toggle Light and Dark theme"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-300 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>
          </div>

          {/* Full-Width 4-Column Swiss Metric Strip */}
          <div className="mt-10 grid grid-cols-2 divide-y divide-zinc-200 rounded-xl border border-zinc-200/80 bg-white/90 sm:grid-cols-4 sm:divide-x sm:divide-y-0 dark:divide-slate-800 dark:border-slate-800/80 dark:bg-slate-900/88">
            {store.profile.metrics.map((m) => (
              <div key={m.label} className="p-5">
                <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{m.label}</p>
                <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums tracking-tight text-zinc-950 dark:text-zinc-50">
                  {m.value}
                </p>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{m.context}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 01. Curriculum & Internships */}
        <CurriculumSection curriculum={store.curriculum} skills={store.skills} />

        {/* 02. Live GitHub Integration & 3D Project Lab */}
        <GitHubProjectsSection
          profile={githubProfile}
          repos={repos}
          loading={githubLoading}
          error={githubError}
          featuredDemos={store.featuredDemos}
          activeLab={activeLab}
          onSelectLab={setActiveLab}
          isDark={isDark}
          onRefreshGitHub={syncGitHub}
        />

        {/* 03. Self-Hosted Services, Mini-Games & Utilities */}
        <ServicesLabSection services={store.services} isDark={isDark} />

        {/* 04. Technical Blog & Documentation (Read-Only on Public Site) */}
        <BlogDocsSection
          posts={store.posts}
          selectedSlug={selectedSlug}
          onSelectPost={handleSelectPost}
        />
      </main>

      <footer className="relative z-10 border-t border-zinc-200/80 bg-white/92 py-10 dark:border-slate-800 dark:bg-slate-950/92">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-6 text-xs text-zinc-500 dark:text-zinc-400">
          <p>
            © {new Date().getFullYear()} {store.profile.name} · Built without external CMS dependencies
          </p>

          <div className="flex flex-wrap items-center gap-6">
            <a
              href={`mailto:${store.profile.email}`}
              className="hover:text-zinc-950 dark:hover:text-zinc-100"
            >
              {store.profile.email}
            </a>
            <a
              href={`https://github.com/${store.profile.githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-950 dark:hover:text-zinc-100"
            >
              GitHub
            </a>
            <a href="/sitemap.xml" className="font-mono hover:text-zinc-950 dark:hover:text-zinc-100">
              sitemap.xml
            </a>
            <a href="/robots.txt" className="font-mono hover:text-zinc-950 dark:hover:text-zinc-100">
              robots.txt
            </a>
          </div>
        </div>
      </footer>

      <GeminiChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} repos={repos} />
    </div>
  );
}
