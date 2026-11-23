import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Image as ImageIcon,
  Lock,
  LogOut,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type {
  AdminStatusResponse,
  ContentEntry,
  CurriculumItem,
  HostedService,
  ImageAspectRatio,
  ImageResolution,
  MilestoneKind,
  PortfolioStore,
  PostKind,
  ServiceCategory,
  ServiceEmbedMode,
} from '../types/portfolio.ts';
import { MarkdownRenderer } from './MarkdownRenderer.tsx';

interface AdminPortalProps {
  store: PortfolioStore;
  onPortfolioChanged: (next: PortfolioStore) => void;
}

type AdminTab = 'posts' | 'media' | 'curriculum' | 'services';

export function AdminPortal({ store, onPortfolioChanged }: AdminPortalProps) {
  // Authentication state held strictly in JS memory (never persisted to localStorage/sessionStorage)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [adminStatus, setAdminStatus] = useState<AdminStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [confirmPasscodeInput, setConfirmPasscodeInput] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [tab, setTab] = useState<AdminTab>('posts');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Blog & Docs Editor State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postKind, setPostKind] = useState<PostKind>('blog');
  const [postTitle, setPostTitle] = useState('');
  const [postSlug, setPostSlug] = useState('');
  const [postSummary, setPostSummary] = useState('');
  const [postTags, setPostTags] = useState('');
  const [postCover, setPostCover] = useState(
    '/src/assets/images/blog_distributed_systems_1795420575949.jpg'
  );
  const [postSeoDesc, setPostSeoDesc] = useState('');
  const [postBody, setPostBody] = useState(
    '## Architecture Notes\n\nWrite Markdown technical notes or documentation here.'
  );
  const [postPublished, setPostPublished] = useState(true);
  const [savingPost, setSavingPost] = useState(false);

  // 1K / 2K / 4K Image Studio State
  const [imgPrompt, setImgPrompt] = useState(
    'Minimalist Swiss architectural diagram of a distributed edge cache cluster on matte paper with crisp cobalt vector lines'
  );
  const [imgSize, setImgSize] = useState<ImageResolution>('2K');
  const [imgAspect, setImgAspect] = useState<ImageAspectRatio>('16:9');
  const [imgGenerating, setImgGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<
    Array<{ url: string; prompt: string; size: ImageResolution; aspect: ImageAspectRatio }>
  >([]);

  // Profile & Curriculum State
  const [profileName, setProfileName] = useState(store.profile.name);
  const [profileRole, setProfileRole] = useState(store.profile.role);
  const [profileHeadline, setProfileHeadline] = useState(store.profile.headline);
  const [profileBio, setProfileBio] = useState(store.profile.bio);
  const [profileGithub, setProfileGithub] = useState(store.profile.githubUsername);
  const [newCurrKind, setNewCurrKind] = useState<MilestoneKind>('internship');
  const [newCurrTitle, setNewCurrTitle] = useState('');
  const [newCurrOrg, setNewCurrOrg] = useState('');
  const [newCurrPeriod, setNewCurrPeriod] = useState('');
  const [newCurrSummary, setNewCurrSummary] = useState('');
  const [newCurrStack, setNewCurrStack] = useState('');

  // Hosted Services & Tools State
  const [srvName, setSrvName] = useState('');
  const [srvCategory, setSrvCategory] = useState<ServiceCategory>('utility');
  const [srvUrl, setSrvUrl] = useState('');
  const [srvCover, setSrvCover] = useState(
    '/src/assets/images/service_dev_workbench_1795421419179.jpg'
  );
  const [srvEmbed, setSrvEmbed] = useState<ServiceEmbedMode>('external-only');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvStack, setSrvStack] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/status');
        if (res.ok && active) {
          setAdminStatus((await res.json()) as AdminStatusResponse);
        }
      } catch {
        if (active) setErrorMessage('Could not check admin status.');
      } finally {
        if (active) setStatusLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const authHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  });

  const handleAuthResponseStatus = (status: number) => {
    if (status === 401) {
      setAuthToken(null);
      setErrorMessage('Session expired or invalid. Please sign in again.');
    }
  };

  const refreshStore = async () => {
    const res = await fetch('/api/portfolio');
    if (res.ok) {
      onPortfolioChanged((await res.json()) as PortfolioStore);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (passcodeInput !== confirmPasscodeInput) {
      setErrorMessage('Passcodes do not match.');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setErrorMessage(data.error || 'Could not initialize admin passcode.');
      } else {
        setAuthToken(data.token);
        setPasscodeInput('');
        setConfirmPasscodeInput('');
        setAdminStatus((prev) => (prev ? { ...prev, configured: true } : prev));
      }
    } catch {
      setErrorMessage('Network error during initial admin setup.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setAuthSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setErrorMessage(data.error || 'Authentication failed.');
      } else {
        setAuthToken(data.token);
        setPasscodeInput('');
      }
    } catch {
      setErrorMessage('Network error during authentication.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const loadPostIntoEditor = (post: ContentEntry) => {
    setEditingPostId(post.id);
    setPostKind(post.kind);
    setPostTitle(post.title);
    setPostSlug(post.slug);
    setPostSummary(post.summary);
    setPostTags(post.tags.join(', '));
    setPostCover(post.coverImageUrl);
    setPostSeoDesc(post.seoDescription);
    setPostBody(post.markdownBody);
    setPostPublished(post.published);
    setErrorMessage(null);
    setStatusMessage(`Loaded "${post.title}" into editor.`);
  };

  const resetPostEditor = () => {
    setEditingPostId(null);
    setPostKind('blog');
    setPostTitle('');
    setPostSlug('');
    setPostSummary('');
    setPostTags('');
    setPostCover('/src/assets/images/blog_distributed_systems_1795420575949.jpg');
    setPostSeoDesc('');
    setPostBody('## Section Heading\n\nWrite your technical post or specification here.');
    setPostPublished(true);
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPost(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const url = editingPostId ? `/api/posts/${encodeURIComponent(editingPostId)}` : '/api/posts';
      const res = await fetch(url, {
        method: editingPostId ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          kind: postKind,
          title: postTitle,
          slug: postSlug,
          summary: postSummary,
          tags: postTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          coverImageUrl: postCover,
          seoDescription: postSeoDesc,
          markdownBody: postBody,
          published: postPublished,
        }),
      });
      handleAuthResponseStatus(res.status);
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to save entry.');
      } else {
        setEditingPostId(data.id);
        setPostSlug(data.slug);
        await refreshStore();
        setStatusMessage('Entry saved locally and sitemap updated.');
      }
    } catch {
      setErrorMessage('Network error while saving entry.');
    } finally {
      setSavingPost(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    setErrorMessage(null);
    const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    handleAuthResponseStatus(res.status);
    if (res.ok) {
      if (editingPostId === id) resetPostEditor();
      await refreshStore();
      setStatusMessage('Entry deleted.');
    }
  };

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setImgGenerating(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          prompt: imgPrompt,
          imageSize: imgSize,
          aspectRatio: imgAspect,
        }),
      });
      handleAuthResponseStatus(res.status);
      const data = (await res.json()) as {
        imageUrl?: string;
        imageSize?: ImageResolution;
        aspectRatio?: ImageAspectRatio;
        error?: string;
      };
      if (!res.ok || !data.imageUrl) {
        setErrorMessage(data.error || 'Image generation failed.');
      } else {
        setGeneratedImages((prev) => [
          {
            url: data.imageUrl!,
            prompt: imgPrompt,
            size: data.imageSize ?? imgSize,
            aspect: data.aspectRatio ?? imgAspect,
          },
          ...prev,
        ]);
        setStatusMessage(`Generated ${imgSize} asset via gemini-3-pro-image-preview.`);
      }
    } catch {
      setErrorMessage('Network error while generating image.');
    } finally {
      setImgGenerating(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const res = await fetch('/api/portfolio/profile', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        name: profileName,
        role: profileRole,
        headline: profileHeadline,
        bio: profileBio,
        githubUsername: profileGithub,
      }),
    });
    handleAuthResponseStatus(res.status);
    const data = await res.json();
    if (!res.ok) {
      setErrorMessage(data.error || 'Could not update profile.');
    } else {
      await refreshStore();
      setStatusMessage('Profile & GitHub handle saved.');
    }
  };

  const handleAddCurriculum = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const res = await fetch('/api/curriculum', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        kind: newCurrKind,
        title: newCurrTitle,
        organization: newCurrOrg,
        period: newCurrPeriod,
        summary: newCurrSummary,
        stack: newCurrStack
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    handleAuthResponseStatus(res.status);
    const data = await res.json();
    if (!res.ok) {
      setErrorMessage(data.error || 'Failed to add milestone.');
    } else {
      setNewCurrTitle('');
      setNewCurrOrg('');
      setNewCurrPeriod('');
      setNewCurrSummary('');
      setNewCurrStack('');
      await refreshStore();
      setStatusMessage('Curriculum milestone added.');
    }
  };

  const handleDeleteCurriculum = async (id: string) => {
    const res = await fetch(`/api/curriculum/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    handleAuthResponseStatus(res.status);
    if (res.ok) {
      await refreshStore();
      setStatusMessage('Milestone removed.');
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        name: srvName,
        category: srvCategory,
        externalUrl: srvUrl,
        coverImageUrl: srvCover,
        embedMode: srvEmbed,
        description: srvDesc,
        techStack: srvStack
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    handleAuthResponseStatus(res.status);
    const data = await res.json();
    if (!res.ok) {
      setErrorMessage(data.error || 'Failed to add service.');
    } else {
      setSrvName('');
      setSrvUrl('');
      setSrvDesc('');
      setSrvStack('');
      await refreshStore();
      setStatusMessage('Hosted tool link added.');
    }
  };

  const handleDeleteService = async (id: string) => {
    const res = await fetch(`/api/services/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    handleAuthResponseStatus(res.status);
    if (res.ok) {
      await refreshStore();
      setStatusMessage('Hosted service removed.');
    }
  };

  // Unauthenticated Gate View
  if (!authToken) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white/95 p-8 shadow-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 font-mono text-xs text-blue-600 dark:text-blue-400">
              <Lock className="h-3.5 w-3.5" />
              <span>Private Local Admin Site</span>
            </div>
            <a
              href="/"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Public Site</span>
            </a>
          </div>

          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {adminStatus?.configured ? 'Authenticate to Edit Portfolio' : 'Claim Private Admin Passcode'}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {adminStatus?.configured
              ? 'Public visitors cannot modify blog posts, curriculum items, or hosted tool links. Enter your passcode to unlock the local studio.'
              : 'Set your initial admin passcode to protect blog publishing, curriculum updates, and media generation.'}
          </p>

          {adminStatus && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-[11px] leading-relaxed text-zinc-600 dark:border-slate-800 dark:bg-slate-900 dark:text-zinc-400">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  Network Posture:{' '}
                  {adminStatus.localOnly
                    ? 'Localhost-Only Lock Active'
                    : 'Authenticated Session Mode'}
                </span>
              </div>
              <p className="mt-1">
                When self-hosting without open-internet access, set{' '}
                <code className="font-mono">LOCAL_ADMIN_ONLY=true</code> and{' '}
                <code className="font-mono">ADMIN_PASSCODE</code> in your private server{' '}
                <code className="font-mono">.env</code> so <code className="font-mono">/admin</code>{' '}
                only responds to localhost or your private LAN.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          {statusLoading ? (
            <p className="mt-6 text-xs text-zinc-500">Checking authentication status...</p>
          ) : adminStatus?.configured ? (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Admin Passcode
                <input
                  type="password"
                  required
                  autoFocus
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="Enter admin passcode"
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100"
                />
              </label>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
              >
                {authSubmitting ? 'Verifying...' : 'Unlock Local Studio'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleBootstrap} className="mt-6 space-y-4">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Create Admin Passcode (min 6 characters)
                <input
                  type="password"
                  required
                  minLength={6}
                  autoFocus
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="Choose strong passcode"
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100"
                />
              </label>

              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Confirm Passcode
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPasscodeInput}
                  onChange={(e) => setConfirmPasscodeInput(e.target.value)}
                  placeholder="Repeat passcode"
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-100"
                />
              </label>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full rounded-lg bg-zinc-950 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950"
              >
                {authSubmitting ? 'Saving Passcode...' : 'Claim Admin Access'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Authenticated Admin Workspace
  return (
    <div className="relative z-10 min-h-screen bg-zinc-50/95 text-zinc-950 dark:bg-slate-950/95 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-blue-600 dark:text-blue-400">
              Authenticated Local Publishing Console
            </p>
            <h1 className="font-display text-xl font-semibold">
              {store.profile.name} — Private Studio
            </h1>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-slate-900">
            {(
              [
                { id: 'posts', label: 'Blog & Docs' },
                { id: 'media', label: '1K/2K/4K Media' },
                { id: 'curriculum', label: 'Profile & CV' },
                { id: 'services', label: 'Hosted Tools' },
              ] as Array<{ id: AdminTab; label: string }>
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  tab === t.id
                    ? 'bg-white text-zinc-950 shadow-xs dark:bg-slate-800 dark:text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-slate-700 dark:text-zinc-200 dark:hover:bg-slate-900 whitespace-nowrap"
            >
              View Public Site
            </a>
            <button
              type="button"
              onClick={() => setAuthToken(null)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {(errorMessage || statusMessage) && (
        <div
          className={`border-b px-6 py-2.5 text-xs font-medium ${
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300'
              : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200'
          }`}
        >
          <div className="mx-auto max-w-[1280px]">{errorMessage || statusMessage}</div>
        </div>
      )}

      <main className="mx-auto max-w-[1280px] p-6">
        {tab === 'posts' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <aside className="space-y-2 lg:col-span-3">
              <button
                type="button"
                onClick={resetPostEditor}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-slate-700 dark:bg-slate-900 dark:text-zinc-300"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Post / Doc</span>
              </button>

              <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {store.posts.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-start justify-between gap-2 p-3 ${
                      editingPostId === p.id ? 'bg-blue-50/70 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => loadPostIntoEditor(p)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="font-mono text-[11px] text-zinc-500">
                        {p.kind} · {p.published ? 'published' : 'draft'}
                      </p>
                      <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {p.title}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePost(p.id)}
                      aria-label={`Delete ${p.title}`}
                      className="p-1 text-zinc-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </aside>

            <form onSubmit={handleSavePost} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium">
                  Entry Type
                  <select
                    value={postKind}
                    onChange={(e) => setPostKind(e.target.value as PostKind)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="blog">Blog Post</option>
                    <option value="doc">Technical Doc</option>
                  </select>
                </label>
                <label className="block text-xs font-medium">
                  URL Slug
                  <input
                    type="text"
                    value={postSlug}
                    onChange={(e) => setPostSlug(e.target.value)}
                    placeholder="auto-generated"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              </div>

              <label className="block text-xs font-medium">
                Title
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <label className="block text-xs font-medium">
                Summary &amp; SEO Description
                <textarea
                  rows={2}
                  value={postSummary}
                  onChange={(e) => {
                    setPostSummary(e.target.value);
                    if (!postSeoDesc) setPostSeoDesc(e.target.value);
                  }}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium">
                  Tags (comma separated)
                  <input
                    type="text"
                    value={postTags}
                    onChange={(e) => setPostTags(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
                <label className="block text-xs font-medium">
                  Cover Image URL
                  <input
                    type="text"
                    value={postCover}
                    onChange={(e) => setPostCover(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              </div>

              <label className="block text-xs font-medium">
                Markdown Body
                <textarea
                  required
                  rows={12}
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={postPublished}
                    onChange={(e) => setPostPublished(e.target.checked)}
                    className="accent-blue-600"
                  />
                  <span>Published</span>
                </label>

                <button
                  type="submit"
                  disabled={savingPost}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingPost ? 'Saving...' : 'Save Entry'}</span>
                </button>
              </div>
            </form>

            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
              <p className="mb-3 font-mono text-xs uppercase tracking-wider text-zinc-500">
                Live Markdown Preview
              </p>
              <h2 className="font-display text-xl font-semibold">
                {postTitle || 'Untitled Entry'}
              </h2>
              <div className="mt-4">
                <MarkdownRenderer content={postBody} />
              </div>
            </div>
          </div>
        )}

        {tab === 'media' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <form onSubmit={handleGenerateImage} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Technical Cover &amp; Diagram Studio
                </h2>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Uses <code className="font-mono">gemini-3-pro-image-preview</code> with 1K, 2K, and 4K resolution selection.
                </p>
              </div>

              <label className="block text-xs font-medium">
                Image Prompt
                <textarea
                  required
                  rows={4}
                  value={imgPrompt}
                  onChange={(e) => setImgPrompt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <div>
                <span className="block text-xs font-medium">Output Resolution (1K / 2K / 4K)</span>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(['1K', '2K', '4K'] as ImageResolution[]).map((resOption) => (
                    <button
                      key={resOption}
                      type="button"
                      onClick={() => setImgSize(resOption)}
                      className={`rounded-lg border py-2 font-mono text-xs font-semibold ${
                        imgSize === resOption
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-zinc-300 dark:border-slate-700'
                      }`}
                    >
                      {resOption}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium">Aspect Ratio</span>
                <div className="mt-1.5 grid grid-cols-4 gap-2">
                  {(['16:9', '4:3', '1:1', '3:4'] as ImageAspectRatio[]).map((ar) => (
                    <button
                      key={ar}
                      type="button"
                      onClick={() => setImgAspect(ar)}
                      className={`rounded-lg border py-1.5 font-mono text-xs ${
                        imgAspect === ar
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-zinc-300 dark:border-slate-700'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={imgGenerating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950"
              >
                <ImageIcon className="h-4 w-4" />
                <span>{imgGenerating ? `Generating ${imgSize}...` : `Generate ${imgSize} Asset`}</span>
              </button>
            </form>

            <div className="space-y-4 lg:col-span-7">
              <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
                Generated Assets ({generatedImages.length})
              </p>
              {generatedImages.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-xs text-zinc-500 dark:border-slate-700 dark:bg-slate-900">
                  Generated 1K, 2K, and 4K visuals will appear here and can be attached to any blog post or hosted tool card.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {generatedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                    >
                      <img
                        src={img.url}
                        alt={img.prompt}
                        referrerPolicy="no-referrer"
                        className="aspect-video w-full object-cover"
                      />
                      <div className="flex items-center justify-between gap-2 p-3">
                        <span className="font-mono text-[11px] text-zinc-500">
                          {img.size} · {img.aspect}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPostCover(img.url);
                              setTab('posts');
                              setStatusMessage('Attached image as active post cover.');
                            }}
                            className="rounded bg-blue-600 px-2 py-1 text-[11px] font-medium text-white"
                          >
                            Use for Post
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSrvCover(img.url);
                              setTab('services');
                              setStatusMessage('Attached image to hosted tool form.');
                            }}
                            className="rounded border border-zinc-300 px-2 py-1 text-[11px] font-medium dark:border-slate-700"
                          >
                            Use for Tool
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'curriculum' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <form onSubmit={handleSaveProfile} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-display text-base font-semibold">Identity &amp; GitHub Handle</h2>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Full Name"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                type="text"
                value={profileRole}
                onChange={(e) => setProfileRole(e.target.value)}
                placeholder="Role Title"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                type="text"
                value={profileGithub}
                onChange={(e) => setProfileGithub(e.target.value)}
                placeholder="GitHub Username"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <textarea
                rows={2}
                value={profileHeadline}
                onChange={(e) => setProfileHeadline(e.target.value)}
                placeholder="Headline"
                className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <textarea
                rows={3}
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                placeholder="Biography"
                className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Save Profile
              </button>
            </form>

            <div className="space-y-5">
              <form onSubmit={handleAddCurriculum} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-display text-base font-semibold">Add Curriculum Milestone</h2>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newCurrKind}
                    onChange={(e) => setNewCurrKind(e.target.value as MilestoneKind)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="internship">Internship</option>
                    <option value="academic">Academic</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={newCurrPeriod}
                    onChange={(e) => setNewCurrPeriod(e.target.value)}
                    placeholder="Jun 2025 — Sep 2025"
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={newCurrTitle}
                  onChange={(e) => setNewCurrTitle(e.target.value)}
                  placeholder="Role or Degree Title"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
                <input
                  type="text"
                  required
                  value={newCurrOrg}
                  onChange={(e) => setNewCurrOrg(e.target.value)}
                  placeholder="Organization"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
                <textarea
                  rows={2}
                  value={newCurrSummary}
                  onChange={(e) => setNewCurrSummary(e.target.value)}
                  placeholder="Summary..."
                  className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
                <input
                  type="text"
                  value={newCurrStack}
                  onChange={(e) => setNewCurrStack(e.target.value)}
                  placeholder="Stack (comma separated)"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950"
                >
                  Add Milestone
                </button>
              </form>

              <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {store.curriculum.map((c: CurriculumItem) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 p-3.5 text-xs">
                    <div>
                      <p className="font-semibold">{c.title}</p>
                      <p className="text-zinc-500">
                        {c.organization} · {c.period}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCurriculum(c.id)}
                      aria-label={`Remove ${c.title}`}
                      className="p-1 text-zinc-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'services' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <form onSubmit={handleAddService} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-display text-base font-semibold">Add Hosted Tool / Mini-Game</h2>
              <input
                type="text"
                required
                value={srvName}
                onChange={(e) => setSrvName(e.target.value)}
                placeholder="Tool or Mini-Game Name"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={srvCategory}
                  onChange={(e) => setSrvCategory(e.target.value as ServiceCategory)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="utility">Utility</option>
                  <option value="mini-game">Mini-Game</option>
                  <option value="service">Hosted Service</option>
                </select>
                <select
                  value={srvEmbed}
                  onChange={(e) => setSrvEmbed(e.target.value as ServiceEmbedMode)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="external-only">External Link</option>
                  <option value="iframe">Iframe Sandbox</option>
                </select>
              </div>
              <input
                type="url"
                required
                value={srvUrl}
                onChange={(e) => setSrvUrl(e.target.value)}
                placeholder="https://tools.yourdomain.dev/..."
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                type="text"
                value={srvCover}
                onChange={(e) => setSrvCover(e.target.value)}
                placeholder="Cover Image URL"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <textarea
                rows={2}
                value={srvDesc}
                onChange={(e) => setSrvDesc(e.target.value)}
                placeholder="Description..."
                className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <input
                type="text"
                value={srvStack}
                onChange={(e) => setSrvStack(e.target.value)}
                placeholder="Stack (comma separated)"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Add Hosted Tool
              </button>
            </form>

            <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {store.services.map((s: HostedService) => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-4 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold">{s.name}</p>
                    <p className="truncate font-mono text-zinc-500">
                      {s.category} · {s.externalUrl}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteService(s.id)}
                    aria-label={`Remove ${s.name}`}
                    className="p-1 text-zinc-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
