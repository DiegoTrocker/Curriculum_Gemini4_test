export type MilestoneKind = 'academic' | 'internship';

export interface ProfileData {
  name: string;
  role: string;
  headline: string;
  bio: string;
  email: string;
  location: string;
  availability: string;
  githubUsername: string;
  websiteUrl: string;
  portraitUrl: string;
  metrics: Array<{
    label: string;
    value: string;
    context: string;
  }>;
}

export interface CurriculumItem {
  id: string;
  kind: MilestoneKind;
  title: string;
  organization: string;
  location: string;
  period: string;
  summary: string;
  outcomes: string[];
  stack: string[];
}

export interface SkillGroup {
  category: string;
  items: Array<{
    name: string;
    level: string;
  }>;
}

export type PostKind = 'blog' | 'doc';

export interface ContentEntry {
  id: string;
  slug: string;
  kind: PostKind;
  title: string;
  summary: string;
  markdownBody: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  readingTimeMinutes: number;
  coverImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  published: boolean;
}

export type ServiceCategory = 'mini-game' | 'utility' | 'service';
export type ServiceEmbedMode = 'native-lab' | 'iframe' | 'external-only';

export interface HostedService {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  externalUrl: string;
  coverImageUrl: string;
  embedMode: ServiceEmbedMode;
  nativeLabId?: 'vector-dodge' | 'dev-workbench';
  techStack: string[];
  hostLabel: string;
}

export interface FeaturedDemoLink {
  repoName: string;
  labPresetId: 'wave-terrain' | 'orbital-swarm' | 'vector-dodge';
  demoLabel: string;
}

export interface PortfolioStore {
  profile: ProfileData;
  curriculum: CurriculumItem[];
  skills: SkillGroup[];
  posts: ContentEntry[];
  services: HostedService[];
  featuredDemos: FeaturedDemoLink[];
}

export interface GitHubUserProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  location: string | null;
  blog: string | null;
}

export interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  updated_at: string;
  fork: boolean;
}

export type ChatMode = 'general' | 'fast' | 'interactive' | 'deep-reasoning';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  modelUsed?: string;
  timestamp: string;
}

export type ImageResolution = '1K' | '2K' | '4K';
export type ImageAspectRatio = '16:9' | '4:3' | '1:1' | '3:4';

export interface AdminStatusResponse {
  configured: boolean;
  localOnly: boolean;
  isLocalRequest: boolean;
  envOverrideActive: boolean;
}
