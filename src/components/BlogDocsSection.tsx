import { useMemo, useState } from 'react';
import { ArrowUpRight, FileText, Search, X } from 'lucide-react';
import type { ContentEntry, PostKind } from '../types/portfolio.ts';
import { MarkdownRenderer } from './MarkdownRenderer.tsx';

interface BlogDocsSectionProps {
  posts: ContentEntry[];
  selectedSlug: string | null;
  onSelectPost: (post: ContentEntry | null) => void;
}

function CoverThumbnail({ src, alt, title }: { src: string; alt: string; title: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-200 p-4 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <p className="line-clamp-2 font-display text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {title}
        </p>
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

export function BlogDocsSection({
  posts,
  selectedSlug,
  onSelectPost,
}: BlogDocsSectionProps) {
  const [kindFilter, setKindFilter] = useState<'all' | PostKind>('all');
  const [query, setQuery] = useState('');

  const publishedPosts = useMemo(() => posts.filter((p) => p.published), [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publishedPosts.filter((p) => {
      if (kindFilter !== 'all' && p.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [publishedPosts, kindFilter, query]);

  const activePost = useMemo(
    () => (selectedSlug ? posts.find((p) => p.slug === selectedSlug) ?? null : null),
    [posts, selectedSlug]
  );

  return (
    <section id="blog" className="border-t border-zinc-200/80 py-16 dark:border-slate-800/80">
      <div className="flex flex-wrap items-end justify-between gap-6 rounded-2xl border border-zinc-200/80 bg-white/90 p-6 dark:border-slate-800/80 dark:bg-slate-900/88">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400">
            04. Technical Blog &amp; Documentation
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Engineering Notes &amp; System Specifications
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter articles or tags..."
              aria-label="Filter articles and technical docs"
              className="w-56 rounded-lg border border-zinc-300 bg-white py-1.5 pr-3 pl-8 text-xs text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-zinc-100"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-slate-800">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'blog', label: 'Blog' },
                { id: 'doc', label: 'Docs' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setKindFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  kindFilter === tab.id
                    ? 'bg-white text-zinc-950 shadow-xs dark:bg-slate-800 dark:text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white/95 p-8 text-sm text-zinc-500 dark:border-slate-800 dark:bg-slate-900/90 dark:text-zinc-400">
          No published posts match that filter.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {filtered.map((post) => (
            <article
              key={post.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white/95 transition-colors hover:border-zinc-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700"
            >
              <div className="aspect-[4/3] w-full overflow-hidden border-b border-zinc-200 dark:border-slate-800">
                <CoverThumbnail
                  src={post.coverImageUrl}
                  alt={post.title}
                  title={post.title}
                />
              </div>

              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {post.kind === 'doc' ? 'Documentation' : 'Blog'} · {post.readingTimeMinutes} min read · {post.publishedAt}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-semibold leading-snug tracking-tight text-zinc-950 dark:text-zinc-50">
                    {post.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {post.summary}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-3.5 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onSelectPost(post)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap shrink-0"
                  >
                    <span>Read Entry</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>

                  {post.tags.length > 0 && (
                    <span className="truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {post.tags.slice(0, 2).join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Read-Only Article / Documentation Reader Modal */}
      {activePost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activePost.title}
        >
          <article className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
            <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5 dark:border-slate-800">
              <div>
                <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {activePost.kind === 'doc' ? 'Technical Documentation' : 'Blog Post'} ·{' '}
                  {activePost.readingTimeMinutes} min read · Updated {activePost.updatedAt}
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {activePost.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onSelectPost(null)}
                aria-label="Close article reader"
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-slate-900 dark:hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="overflow-y-auto px-6 py-6">
              {activePost.coverImageUrl && (
                <div className="mb-6 aspect-[16/9] w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-slate-800">
                  <CoverThumbnail
                    src={activePost.coverImageUrl}
                    alt={activePost.title}
                    title={activePost.title}
                  />
                </div>
              )}

              <p className="mb-6 font-editorial text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
                {activePost.summary}
              </p>

              <MarkdownRenderer content={activePost.markdownBody} />
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
