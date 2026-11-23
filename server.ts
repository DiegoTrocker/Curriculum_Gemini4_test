import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { SEED_PORTFOLIO } from './src/data/seedPortfolio.js';
import type {
  ChatMessage,
  ChatMode,
  ContentEntry,
  CurriculumItem,
  HostedService,
  ImageAspectRatio,
  ImageResolution,
  PortfolioStore,
  ProfileData,
} from './src/types/portfolio.js';

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'portfolio.json');
const ADMIN_AUTH_FILE = path.resolve(DATA_DIR, 'admin-auth.json');

if (!DATA_FILE.startsWith(DATA_DIR + path.sep) || !ADMIN_AUTH_FILE.startsWith(DATA_DIR + path.sep)) {
  throw new Error('Invalid data storage path resolution.');
}

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasscodeHash(passcode: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(passcode, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function verifyPlainPasscodeConstantTime(input: string, target: string): boolean {
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(target).digest();
  return crypto.timingSafeEqual(a, b);
}

function readStoredAdminHash(): string | null {
  if (!fs.existsSync(ADMIN_AUTH_FILE)) return null;
  try {
    const raw = fs.readFileSync(ADMIN_AUTH_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as { passcodeHash?: string };
    return typeof parsed.passcodeHash === 'string' && parsed.passcodeHash.includes(':')
      ? parsed.passcodeHash
      : null;
  } catch {
    return null;
  }
}

function writeStoredAdminHash(passcodeHash: string): void {
  ensureDataDir();
  fs.writeFileSync(
    ADMIN_AUTH_FILE,
    JSON.stringify({ passcodeHash, updatedAt: new Date().toISOString() }, null, 2),
    'utf-8'
  );
}

function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSCODE?.trim()) || Boolean(readStoredAdminHash());
}

function signSessionToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: expiresAt, nonce })).toString(
    'base64url'
  );
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return { token: `${payload}.${sig}`, expiresAt };
}

function verifySessionToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload || !sig) return false;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      role?: string;
      exp?: number;
    };
    return decoded.role === 'admin' && typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function isLoopbackRequest(req: Request): boolean {
  const rawIp = req.ip || req.socket.remoteAddress || '';
  const host = (req.hostname || '').toLowerCase();
  const isLoopIp =
    rawIp === '127.0.0.1' || rawIp === '::1' || rawIp === '::ffff:127.0.0.1';
  const isLoopHost = host === 'localhost' || host === '127.0.0.1';
  return isLoopIp && isLoopHost;
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const localOnly = process.env.LOCAL_ADMIN_ONLY === 'true';
  if (localOnly && !isLoopbackRequest(req)) {
    res.status(403).json({
      error:
        'LOCAL_ADMIN_ONLY is enabled. Admin editing is restricted to localhost / private loopback access.',
    });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token || !verifySessionToken(token)) {
    res.status(401).json({ error: 'Authentication required. Sign in via /admin.' });
    return;
  }
  next();
}

function ensureStore(): PortfolioStore {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_PORTFOLIO, null, 2), 'utf-8');
    return structuredClone(SEED_PORTFOLIO);
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PortfolioStore>;
    return {
      profile: { ...SEED_PORTFOLIO.profile, ...(parsed.profile ?? {}) },
      curriculum: Array.isArray(parsed.curriculum) ? parsed.curriculum : SEED_PORTFOLIO.curriculum,
      skills: Array.isArray(parsed.skills) ? parsed.skills : SEED_PORTFOLIO.skills,
      posts: Array.isArray(parsed.posts) ? parsed.posts : SEED_PORTFOLIO.posts,
      services: Array.isArray(parsed.services) ? parsed.services : SEED_PORTFOLIO.services,
      featuredDemos: Array.isArray(parsed.featuredDemos)
        ? parsed.featuredDemos
        : SEED_PORTFOLIO.featuredDemos,
    };
  } catch {
    return structuredClone(SEED_PORTFOLIO);
  }
}

function writeStore(store: PortfolioStore): void {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function isSafeUrl(value: unknown, allowDataImage = false): boolean {
  if (typeof value !== 'string' || value.trim() === '') return false;
  const trimmed = value.trim();
  if (trimmed.startsWith('/src/assets/')) return true;
  if (allowDataImage && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidGitHubSlug(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(value);
}

function sanitizeSlug(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `entry-${Date.now()}`;
}

function estimateReadingMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveBaseUrl(req: Request): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && isSafeUrl(envUrl)) {
    return envUrl.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function buildSeoHeadSnippet(req: Request, store: PortfolioStore): {
  title: string;
  description: string;
  canonicalUrl: string;
  jsonLd: string;
  isNoIndex: boolean;
} {
  const baseUrl = resolveBaseUrl(req);
  const reqPath = (req.originalUrl || req.path || '/').split('?')[0];
  if (reqPath === '/admin') {
    return {
      title: `Private Admin Console — ${store.profile.name}`,
      description: 'Authenticated local publishing console.',
      canonicalUrl: `${baseUrl}/admin`,
      jsonLd: '',
      isNoIndex: true,
    };
  }

  let title = `${store.profile.name} — ${store.profile.role}`;
  let description = store.profile.headline;

  const blogMatch = reqPath.match(/^\/(?:blog|docs)\/([a-zA-Z0-9-]+)$/);
  let matchedPost: ContentEntry | undefined;
  if (blogMatch) {
    matchedPost = store.posts.find((p) => p.slug === blogMatch[1] && p.published);
    if (matchedPost) {
      title = matchedPost.seoTitle || `${matchedPost.title} — ${store.profile.name}`;
      description = matchedPost.seoDescription || matchedPost.summary;
    }
  }

  const canonicalUrl = `${baseUrl}${reqPath === '/' ? '' : reqPath}`;
  const structuredData = matchedPost
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: matchedPost.title,
        description,
        datePublished: matchedPost.publishedAt,
        dateModified: matchedPost.updatedAt,
        author: {
          '@type': 'Person',
          name: store.profile.name,
          url: baseUrl,
        },
        url: canonicalUrl,
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: title,
        description,
        url: canonicalUrl,
        mainEntity: {
          '@type': 'Person',
          name: store.profile.name,
          jobTitle: store.profile.role,
          description: store.profile.bio,
          url: baseUrl,
          sameAs: [`https://github.com/${store.profile.githubUsername}`],
        },
      };

  return {
    title,
    description,
    canonicalUrl,
    jsonLd: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
    isNoIndex: false,
  };
}

function injectSeoIntoHtml(html: string, req: Request, store: PortfolioStore): string {
  const { title, description, canonicalUrl, jsonLd, isNoIndex } = buildSeoHeadSnippet(req, store);
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeUrl = escapeHtml(canonicalUrl);

  let output = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${safeTitle}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/,
      `<meta name="description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/,
      `<meta property="og:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/,
      `<meta property="og:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/,
      `<meta name="twitter:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/,
      `<meta name="twitter:description" content="${safeDesc}" />`
    );

  const extraHead = isNoIndex
    ? `<meta name="robots" content="noindex, nofollow" />`
    : `
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:url" content="${safeUrl}" />
    <script type="application/ld+json">${jsonLd}</script>
  `;
  output = output.replace('</head>', `${extraHead}\n  </head>`);
  return output;
}

const githubCache = new Map<string, { expiresAt: number; data: unknown }>();

async function fetchGitHubJson(url: string, accept = 'application/vnd.github+json'): Promise<{
  status: number;
  data: unknown;
}> {
  const cacheKey = `${accept}:${url}`;
  const cached = githubCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { status: 200, data: cached.data };
  }

  const headers: Record<string, string> = {
    Accept: accept,
    'User-Agent': 'diego-trocker-portfolio-server',
  };
  if (process.env.GITHUB_TOKEN?.trim()) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN.trim()}`;
  }

  const upstream = await fetch(url, { headers });
  const contentType = upstream.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await upstream.json() : await upstream.text();

  if (upstream.ok) {
    githubCache.set(cacheKey, { expiresAt: Date.now() + 5 * 60 * 1000, data });
  }
  return { status: upstream.status, data };
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function resolveChatModel(mode: ChatMode): { model: string; roleDescription: string } {
  switch (mode) {
    case 'fast':
      return {
        model: 'gemini-3.1-flash-lite',
        roleDescription:
          'You are the Fast Curriculum Concierge. Give crisp, scannable answers about academic milestones, internships, and technical stacks in 2-4 concise sentences.',
      };
    case 'interactive':
      return {
        model: 'gemini-4-neon',
        roleDescription:
          'You are the Interactive Code & 3D Lab Reviewer. Explain Three.js shaders, WebGL architectures, repository demos, and self-hosted utilities with clear technical precision and practical code insights.',
      };
    case 'deep-reasoning':
      return {
        model: 'gemini-4-carbon',
        roleDescription:
          'You are the Principal Systems Architect Reviewer. Perform deep engineering reasoning across distributed systems trade-offs, performance budgets, and software design choices grounded in the portfolio.',
      };
    case 'general':
    default:
      return {
        model: 'gemini-4-hydrogen',
        roleDescription:
          'You are the Engineering Portfolio Guide. Help recruiters, collaborators, and visitors explore the developer curriculum, GitHub projects, blog documentation, and self-hosted services accurately.',
      };
  }
}

function extractUpstreamErrorMessage(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return { status: 400, message: raw };
  }
  if (/403|PERMISSION_DENIED/i.test(raw)) {
    return {
      status: 403,
      message:
        'Permission denied for this model. Verify your API key or select a billing-enabled key in Settings > Secrets.',
    };
  }
  if (/429|RESOURCE_EXHAUSTED/i.test(raw)) {
    return {
      status: 429,
      message:
        'Quota exhausted for this model. If using a paid-tier model (gemini-4-neon, gemini-4-carbon, or gemini-3-pro-image-preview), attach a billing-enabled key in Settings > Secrets or switch to gemini-4-hydrogen.',
    };
  }
  if (/404|NOT_FOUND/i.test(raw)) {
    return {
      status: 404,
      message: `Requested Gemini model could not be reached (${raw}).`,
    };
  }
  return { status: 500, message: raw || 'Upstream AI request failed.' };
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '12mb' }));

  // Admin Authentication Endpoints (Separate Local Admin Site)
  app.get('/api/admin/status', (req: Request, res: Response) => {
    res.json({
      configured: isAdminConfigured(),
      localOnly: process.env.LOCAL_ADMIN_ONLY === 'true',
      isLocalRequest: isLoopbackRequest(req),
      envOverrideActive: Boolean(process.env.ADMIN_PASSCODE?.trim()),
    });
  });

  app.post('/api/admin/bootstrap', (req: Request, res: Response) => {
    if (process.env.LOCAL_ADMIN_ONLY === 'true' && !isLoopbackRequest(req)) {
      res.status(403).json({
        error: 'LOCAL_ADMIN_ONLY is enabled. Initial admin setup must run from localhost.',
      });
      return;
    }
    if (isAdminConfigured()) {
      res.status(409).json({ error: 'Admin passcode is already configured.' });
      return;
    }
    const { passcode } = req.body as { passcode?: string };
    if (typeof passcode !== 'string' || passcode.trim().length < 6) {
      res.status(400).json({ error: 'Passcode must be at least 6 characters.' });
      return;
    }
    const hash = hashPasscode(passcode.trim());
    writeStoredAdminHash(hash);
    const { token, expiresAt } = signSessionToken();
    res.status(201).json({ token, expiresAt });
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    if (process.env.LOCAL_ADMIN_ONLY === 'true' && !isLoopbackRequest(req)) {
      res.status(403).json({
        error: 'LOCAL_ADMIN_ONLY is enabled. Sign in directly from localhost.',
      });
      return;
    }
    if (!isAdminConfigured()) {
      res.status(400).json({ error: 'Admin passcode is not configured yet.' });
      return;
    }
    const { passcode } = req.body as { passcode?: string };
    if (typeof passcode !== 'string' || !passcode.trim()) {
      res.status(400).json({ error: 'Passcode is required.' });
      return;
    }

    const envPass = process.env.ADMIN_PASSCODE?.trim();
    const valid = envPass
      ? verifyPlainPasscodeConstantTime(passcode.trim(), envPass)
      : (() => {
          const stored = readStoredAdminHash();
          return stored ? verifyPasscodeHash(passcode.trim(), stored) : false;
        })();

    if (!valid) {
      res.status(401).json({ error: 'Invalid admin passcode.' });
      return;
    }
    const { token, expiresAt } = signSessionToken();
    res.json({ token, expiresAt });
  });

  // Public Read Portfolio API
  app.get('/api/portfolio', (_req: Request, res: Response) => {
    const store = ensureStore();
    res.json(store);
  });

  // Authenticated Admin Mutation APIs
  app.put('/api/portfolio/profile', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const incoming = req.body as Partial<ProfileData>;

    if (incoming.githubUsername !== undefined && !isValidGitHubSlug(incoming.githubUsername)) {
      res.status(400).json({ error: 'Invalid GitHub username format.' });
      return;
    }
    if (incoming.websiteUrl !== undefined && !isSafeUrl(incoming.websiteUrl)) {
      res.status(400).json({ error: 'Website URL must use http or https.' });
      return;
    }
    if (incoming.portraitUrl !== undefined && !isSafeUrl(incoming.portraitUrl, true)) {
      res.status(400).json({ error: 'Invalid portrait URL.' });
      return;
    }

    store.profile = {
      ...store.profile,
      name: typeof incoming.name === 'string' && incoming.name.trim() ? incoming.name.trim() : store.profile.name,
      role: typeof incoming.role === 'string' && incoming.role.trim() ? incoming.role.trim() : store.profile.role,
      headline:
        typeof incoming.headline === 'string' && incoming.headline.trim()
          ? incoming.headline.trim()
          : store.profile.headline,
      bio: typeof incoming.bio === 'string' && incoming.bio.trim() ? incoming.bio.trim() : store.profile.bio,
      email: typeof incoming.email === 'string' && incoming.email.trim() ? incoming.email.trim() : store.profile.email,
      location:
        typeof incoming.location === 'string' && incoming.location.trim()
          ? incoming.location.trim()
          : store.profile.location,
      availability:
        typeof incoming.availability === 'string' && incoming.availability.trim()
          ? incoming.availability.trim()
          : store.profile.availability,
      githubUsername: incoming.githubUsername?.trim() || store.profile.githubUsername,
      websiteUrl: incoming.websiteUrl?.trim() || store.profile.websiteUrl,
      portraitUrl: incoming.portraitUrl?.trim() || store.profile.portraitUrl,
      metrics: Array.isArray(incoming.metrics) ? incoming.metrics.slice(0, 4) : store.profile.metrics,
    };

    writeStore(store);
    res.json(store.profile);
  });

  app.post('/api/curriculum', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const body = req.body as Partial<CurriculumItem>;
    if (!body.title?.trim() || !body.organization?.trim() || !body.period?.trim()) {
      res.status(400).json({ error: 'Title, organization, and period are required.' });
      return;
    }
    const item: CurriculumItem = {
      id: `curr-${Date.now()}`,
      kind: body.kind === 'academic' ? 'academic' : 'internship',
      title: body.title.trim(),
      organization: body.organization.trim(),
      location: body.location?.trim() || 'Remote',
      period: body.period.trim(),
      summary: body.summary?.trim() || '',
      outcomes: Array.isArray(body.outcomes)
        ? body.outcomes.map((o) => String(o).trim()).filter(Boolean)
        : [],
      stack: Array.isArray(body.stack)
        ? body.stack.map((s) => String(s).trim()).filter(Boolean)
        : [],
    };
    store.curriculum = [item, ...store.curriculum];
    writeStore(store);
    res.status(201).json(item);
  });

  app.put('/api/curriculum/:id', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const idx = store.curriculum.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Curriculum entry not found.' });
      return;
    }
    const body = req.body as Partial<CurriculumItem>;
    store.curriculum[idx] = {
      ...store.curriculum[idx],
      kind: body.kind === 'academic' || body.kind === 'internship' ? body.kind : store.curriculum[idx].kind,
      title: body.title?.trim() || store.curriculum[idx].title,
      organization: body.organization?.trim() || store.curriculum[idx].organization,
      location: body.location?.trim() ?? store.curriculum[idx].location,
      period: body.period?.trim() || store.curriculum[idx].period,
      summary: body.summary?.trim() ?? store.curriculum[idx].summary,
      outcomes: Array.isArray(body.outcomes)
        ? body.outcomes.map((o) => String(o).trim()).filter(Boolean)
        : store.curriculum[idx].outcomes,
      stack: Array.isArray(body.stack)
        ? body.stack.map((s) => String(s).trim()).filter(Boolean)
        : store.curriculum[idx].stack,
    };
    writeStore(store);
    res.json(store.curriculum[idx]);
  });

  app.delete('/api/curriculum/:id', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const next = store.curriculum.filter((c) => c.id !== req.params.id);
    if (next.length === store.curriculum.length) {
      res.status(404).json({ error: 'Curriculum entry not found.' });
      return;
    }
    store.curriculum = next;
    writeStore(store);
    res.json({ deleted: true });
  });

  app.post('/api/posts', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const body = req.body as Partial<ContentEntry>;
    if (!body.title?.trim() || !body.markdownBody?.trim()) {
      res.status(400).json({ error: 'Title and Markdown body are required.' });
      return;
    }
    const coverImageUrl =
      body.coverImageUrl && isSafeUrl(body.coverImageUrl, true)
        ? body.coverImageUrl.trim()
        : '/src/assets/images/blog_distributed_systems_1795420575949.jpg';
    const today = new Date().toISOString().slice(0, 10);
    const baseSlug = sanitizeSlug(body.slug?.trim() || body.title);
    const uniqueSlug = store.posts.some((p) => p.slug === baseSlug) ? `${baseSlug}-${Date.now()}` : baseSlug;

    const entry: ContentEntry = {
      id: `post-${Date.now()}`,
      slug: uniqueSlug,
      kind: body.kind === 'doc' ? 'doc' : 'blog',
      title: body.title.trim(),
      summary: body.summary?.trim() || body.markdownBody.slice(0, 150).trim(),
      markdownBody: body.markdownBody,
      tags: Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : [],
      publishedAt: body.publishedAt?.trim() || today,
      updatedAt: today,
      readingTimeMinutes: estimateReadingMinutes(body.markdownBody),
      coverImageUrl,
      seoTitle: body.seoTitle?.trim() || body.title.trim(),
      seoDescription: body.seoDescription?.trim() || body.summary?.trim() || body.title.trim(),
      published: body.published !== false,
    };

    store.posts = [entry, ...store.posts];
    writeStore(store);
    res.status(201).json(entry);
  });

  app.put('/api/posts/:id', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const idx = store.posts.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Entry not found.' });
      return;
    }
    const body = req.body as Partial<ContentEntry>;
    const existing = store.posts[idx];
    const nextBody = typeof body.markdownBody === 'string' ? body.markdownBody : existing.markdownBody;
    const coverImageUrl =
      body.coverImageUrl !== undefined
        ? isSafeUrl(body.coverImageUrl, true)
          ? body.coverImageUrl.trim()
          : existing.coverImageUrl
        : existing.coverImageUrl;

    store.posts[idx] = {
      ...existing,
      kind: body.kind === 'doc' || body.kind === 'blog' ? body.kind : existing.kind,
      slug: body.slug?.trim() ? sanitizeSlug(body.slug) : existing.slug,
      title: body.title?.trim() || existing.title,
      summary: body.summary?.trim() ?? existing.summary,
      markdownBody: nextBody,
      tags: Array.isArray(body.tags)
        ? body.tags.map((t) => String(t).trim()).filter(Boolean)
        : existing.tags,
      updatedAt: new Date().toISOString().slice(0, 10),
      readingTimeMinutes: estimateReadingMinutes(nextBody),
      coverImageUrl,
      seoTitle: body.seoTitle?.trim() || body.title?.trim() || existing.seoTitle,
      seoDescription: body.seoDescription?.trim() || body.summary?.trim() || existing.seoDescription,
      published: typeof body.published === 'boolean' ? body.published : existing.published,
    };
    writeStore(store);
    res.json(store.posts[idx]);
  });

  app.delete('/api/posts/:id', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const next = store.posts.filter((p) => p.id !== req.params.id);
    if (next.length === store.posts.length) {
      res.status(404).json({ error: 'Entry not found.' });
      return;
    }
    store.posts = next;
    writeStore(store);
    res.json({ deleted: true });
  });

  app.post('/api/services', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const body = req.body as Partial<HostedService>;
    const rawUrl = typeof body.externalUrl === 'string' ? body.externalUrl.trim() : '';
    if (!body.name?.trim() || !isSafeUrl(rawUrl)) {
      res.status(400).json({ error: 'Service name and a valid http/https URL are required.' });
      return;
    }
    const coverImageUrl =
      body.coverImageUrl && isSafeUrl(body.coverImageUrl, true)
        ? body.coverImageUrl.trim()
        : '/src/assets/images/service_dev_workbench_1795421419179.jpg';

    const item: HostedService = {
      id: `srv-${Date.now()}`,
      name: body.name.trim(),
      category:
        body.category === 'mini-game' || body.category === 'utility' ? body.category : 'service',
      description: body.description?.trim() || '',
      externalUrl: rawUrl,
      coverImageUrl,
      embedMode:
        body.embedMode === 'native-lab' || body.embedMode === 'iframe'
          ? body.embedMode
          : 'external-only',
      nativeLabId: body.nativeLabId,
      techStack: Array.isArray(body.techStack)
        ? body.techStack.map((t) => String(t).trim()).filter(Boolean)
        : [],
      hostLabel: body.hostLabel?.trim() || new URL(rawUrl).hostname,
    };
    store.services = [item, ...store.services];
    writeStore(store);
    res.status(201).json(item);
  });

  app.delete('/api/services/:id', requireAdminAuth, (req: Request, res: Response) => {
    const store = ensureStore();
    const next = store.services.filter((s) => s.id !== req.params.id);
    if (next.length === store.services.length) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }
    store.services = next;
    writeStore(store);
    res.json({ deleted: true });
  });

  function resolveConfiguredGitHubUsername(store: PortfolioStore): string {
    const envUser = process.env.GITHUB_USERNAME?.trim();
    if (envUser && isValidGitHubSlug(envUser)) {
      return envUser;
    }
    return isValidGitHubSlug(store.profile.githubUsername)
      ? store.profile.githubUsername
      : SEED_PORTFOLIO.profile.githubUsername;
  }

  // Public GitHub REST API Proxy (Username resolved exclusively on the backend)
  app.get('/api/github/profile', async (_req: Request, res: Response) => {
    const store = ensureStore();
    const username = resolveConfiguredGitHubUsername(store);
    try {
      const { status, data } = await fetchGitHubJson(
        `https://api.github.com/users/${encodeURIComponent(username)}`
      );
      if (status >= 400) {
        res.status(status).json({ error: `GitHub profile lookup returned ${status}.`, details: data });
        return;
      }
      res.json(data);
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : 'GitHub API error.' });
    }
  });

  app.get('/api/github/repos', async (_req: Request, res: Response) => {
    const store = ensureStore();
    const username = resolveConfiguredGitHubUsername(store);
    try {
      const { status, data } = await fetchGitHubJson(
        `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=18`
      );
      if (status >= 400 || !Array.isArray(data)) {
        res.status(status >= 400 ? status : 502).json({
          error: `GitHub repositories lookup returned ${status}.`,
        });
        return;
      }
      const repos = data.map((r: Record<string, unknown>) => ({
        id: Number(r.id),
        name: String(r.name ?? ''),
        full_name: String(r.full_name ?? ''),
        description: r.description ? String(r.description) : null,
        html_url: String(r.html_url ?? ''),
        homepage: r.homepage ? String(r.homepage) : null,
        language: r.language ? String(r.language) : null,
        stargazers_count: Number(r.stargazers_count ?? 0),
        forks_count: Number(r.forks_count ?? 0),
        topics: Array.isArray(r.topics) ? r.topics.map(String) : [],
        updated_at: String(r.updated_at ?? ''),
        fork: Boolean(r.fork),
      }));
      res.json(repos);
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : 'GitHub API error.' });
    }
  });

  app.get('/api/github/readme', async (req: Request, res: Response) => {
    const store = ensureStore();
    const owner = resolveConfiguredGitHubUsername(store);
    const repo = (req.query.repo as string | undefined)?.trim();
    if (!isValidGitHubSlug(repo)) {
      res.status(400).json({ error: 'Invalid repository name.' });
      return;
    }
    try {
      const { status, data } = await fetchGitHubJson(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
        'application/vnd.github.raw+json'
      );
      if (status >= 400) {
        res.status(status).json({ error: 'README not found for this repository.' });
        return;
      }
      res.json({ markdown: typeof data === 'string' ? data : JSON.stringify(data, null, 2) });
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : 'GitHub README fetch failed.' });
    }
  });

  // Public Portfolio Chatbot Endpoint
  app.post('/api/chat', async (req: Request, res: Response) => {
    const body = req.body as {
      messages?: ChatMessage[];
      mode?: ChatMode;
      repoSummary?: string;
    };

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user' || !lastMessage.content?.trim()) {
      res.status(400).json({ error: 'A non-empty user message is required.' });
      return;
    }

    const mode: ChatMode = body.mode || 'general';
    const { model, roleDescription } = resolveChatModel(mode);
    const store = ensureStore();

    const portfolioContext = [
      `Developer: ${store.profile.name} (${store.profile.role})`,
      `Location: ${store.profile.location} | Availability: ${store.profile.availability}`,
      `GitHub Handle: ${store.profile.githubUsername}`,
      `Bio: ${store.profile.bio}`,
      `Curriculum Milestones:\n${store.curriculum
        .map((c) => `- [${c.kind}] ${c.title} at ${c.organization} (${c.period}): ${c.summary}`)
        .join('\n')}`,
      `Published Blog & Technical Docs:\n${store.posts
        .filter((p) => p.published)
        .map((p) => `- [${p.kind}] ${p.title}: ${p.summary}`)
        .join('\n')}`,
      `Self-Hosted Tools & Mini-Games:\n${store.services
        .map((s) => `- [${s.category}] ${s.name}: ${s.description}`)
        .join('\n')}`,
      body.repoSummary ? `Live GitHub Repositories:\n${body.repoSummary}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const systemInstruction = `${roleDescription}\n\nGround your answers strictly in this live portfolio context:\n${portfolioContext}`;

    try {
      const ai = getGeminiClient();
      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const chat = ai.chats.create({
        model,
        history,
        config: {
          systemInstruction,
        },
      });

      const response = await chat.sendMessage({
        message: lastMessage.content,
      });

      res.json({
        reply: response.text ?? '',
        modelUsed: model,
      });
    } catch (err) {
      const { status, message } = extractUpstreamErrorMessage(err);
      res.status(status).json({ error: message, modelAttempted: model });
    }
  });

  // Authenticated Admin High-Resolution Image Generation (1K / 2K / 4K)
  app.post('/api/images', requireAdminAuth, async (req: Request, res: Response) => {
    const body = req.body as {
      prompt?: string;
      imageSize?: ImageResolution;
      aspectRatio?: ImageAspectRatio;
    };

    if (!body.prompt?.trim()) {
      res.status(400).json({ error: 'Image prompt is required.' });
      return;
    }

    const imageSize: ImageResolution =
      body.imageSize === '2K' || body.imageSize === '4K' ? body.imageSize : '1K';
    const aspectRatio: ImageAspectRatio =
      body.aspectRatio === '1:1' || body.aspectRatio === '4:3' || body.aspectRatio === '3:4'
        ? body.aspectRatio
        : '16:9';

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: body.prompt.trim() }],
        },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      let imageUrl = '';
      let caption = '';
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }

      if (!imageUrl) {
        res.status(502).json({ error: 'Model returned no image payload.' });
        return;
      }

      res.json({
        imageUrl,
        caption,
        modelUsed: 'gemini-3-pro-image-preview',
        imageSize,
        aspectRatio,
      });
    } catch (err) {
      const { status, message } = extractUpstreamErrorMessage(err);
      res.status(status).json({ error: message, modelAttempted: 'gemini-3-pro-image-preview' });
    }
  });

  // Dynamic SEO Sitemap & Robots.txt (Excludes /admin)
  app.get('/robots.txt', (req: Request, res: Response) => {
    const baseUrl = resolveBaseUrl(req);
    res
      .type('text/plain')
      .send(`User-agent: *\nDisallow: /admin\nDisallow: /api/admin/\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const baseUrl = resolveBaseUrl(req);
    const store = ensureStore();
    const urls = [
      { loc: `${baseUrl}/`, lastmod: new Date().toISOString().slice(0, 10) },
      ...store.posts
        .filter((p) => p.published)
        .map((p) => ({
          loc: `${baseUrl}/${p.kind === 'doc' ? 'docs' : 'blog'}/${p.slug}`,
          lastmod: p.updatedAt,
        })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeHtml(u.loc)}</loc>
    <lastmod>${escapeHtml(u.lastmod)}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  });

  // Optional LOCAL_ADMIN_ONLY guard on the /admin HTML page itself
  app.get('/admin', (req: Request, res: Response, next: NextFunction) => {
    if (process.env.LOCAL_ADMIN_ONLY === 'true' && !isLoopbackRequest(req)) {
      res
        .status(403)
        .type('text/plain')
        .send('403 Forbidden: Private admin site is restricted to localhost access.');
      return;
    }
    next();
  });

  // Vite Middleware (Dev) or Static Dist Serving (Prod) with Server-Injected SEO Metadata
  const isProd =
    process.env.NODE_ENV === 'production' &&
    fs.existsSync(path.resolve(process.cwd(), 'dist/index.html'));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        next();
        return;
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let html = fs.readFileSync(indexPath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        const store = ensureStore();
        html = injectSeoIntoHtml(html, req, store);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { index: false }));
    app.use('*', (req: Request, res: Response) => {
      const html = fs.readFileSync(path.resolve(distDir, 'index.html'), 'utf-8');
      const store = ensureStore();
      res.status(200).set({ 'Content-Type': 'text/html' }).end(injectSeoIntoHtml(html, req, store));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Portfolio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
