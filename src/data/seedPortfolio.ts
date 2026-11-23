import type { PortfolioStore } from '../types/portfolio.js';

export const SEED_PORTFOLIO: PortfolioStore = {
  profile: {
    name: 'Diego Trocker',
    role: 'Systems, Full-Stack & Graphics Engineer',
    headline: 'Building resilient distributed backends, interactive WebGL systems, and self-hosted developer tools.',
    bio: 'Computer Science & Engineering graduate focused on low-latency web runtimes, real-time 3D rendering in Three.js, and minimalist software architecture. I maintain open-source experiments on GitHub alongside self-hosted utilities, technical documentation, and interactive sandboxes.',
    email: 'trockerdiego09@gmail.com',
    location: 'Zurich / Remote',
    availability: 'Open to Software & Graphics Engineering Roles',
    githubUsername: 'DiegoTrocker',
    websiteUrl: 'https://diegotrocker.dev',
    portraitUrl: '/src/assets/images/portrait_engineer_studio_1795420576990.jpg',
    metrics: [
      {
        label: 'Academic Standing',
        value: '3.92 / 4.0',
        context: 'B.Sc. Computer Science Honors',
      },
      {
        label: 'Industry Experience',
        value: '2 Internships',
        context: 'Distributed Systems & WebGL',
      },
      {
        label: 'Published Notes',
        value: '12+ Guides',
        context: 'Architecture & Shader Docs',
      },
      {
        label: 'Self-Hosted Stack',
        value: '4 Services',
        context: 'Sandboxes, Tools & Mini-Games',
      },
    ],
  },
  curriculum: [
    {
      id: 'curr-1',
      kind: 'internship',
      title: 'Software Engineering Intern — Core Runtime & Observability',
      organization: 'Helvetia Cloud Systems',
      location: 'Zurich, Switzerland',
      period: 'May 2025 — Sep 2025',
      summary:
        'Engineered an edge-telemetry ingestion pipeline and interactive WebGL topology visualizer handling real-time node health across multi-region clusters.',
      outcomes: [
        'Reduced p99 telemetry query latency by 41% via pre-aggregated ring buffers.',
        'Built an instanced Three.js cluster topology inspector rendering 4,000+ nodes at 60 fps.',
        'Authored internal MDX runbooks and automated schema regression checks in CI.',
      ],
      stack: ['TypeScript', 'Node.js', 'Three.js', 'PostgreSQL', 'Docker'],
    },
    {
      id: 'curr-2',
      kind: 'internship',
      title: 'Frontend & Graphics Engineering Intern',
      organization: 'Atelier Spatial Labs',
      location: 'Munich / Hybrid',
      period: 'Jun 2024 — Sep 2024',
      summary:
        'Developed physically-based 3D CAD inspection viewports and custom GLSL shader extensions for browser-native hardware prototyping.',
      outcomes: [
        'Implemented software-WebGL detection and on-demand frame coalescing for low-power devices.',
        'Cut initial bundle payload by 34% by replacing legacy dependencies with procedural geometry builders.',
      ],
      stack: ['React', 'Three.js', 'GLSL', 'Tailwind CSS', 'Vite'],
    },
    {
      id: 'curr-3',
      kind: 'academic',
      title: 'B.Sc. in Computer Science — Graphics & Distributed Systems Track',
      organization: 'Technical Institute of Informatics',
      location: 'Bolzano / Zurich Exchange',
      period: '2022 — 2026',
      summary:
        'Undergraduate honors curriculum centered on compiler construction, operating systems, computer graphics, and numerical linear algebra.',
      outcomes: [
        'Senior Thesis: Real-Time Signed Distance Field Terrain & Procedural PBR Shading in WebGL2.',
        'Teaching Assistant for Algorithms & Data Structures (3 semesters, 120+ students mentored).',
        '1st Place, University Systems Hackathon — Built a peer-to-peer collaborative canvas in 36 hours.',
      ],
      stack: ['C++', 'Rust', 'WebGL2', 'TypeScript', 'Algorithms'],
    },
    {
      id: 'curr-4',
      kind: 'academic',
      title: 'Open-Source Research Fellow — Browser Physics & Sandboxing',
      organization: 'University Visualization Lab',
      location: 'Campus Lab',
      period: 'Oct 2023 — Apr 2024',
      summary:
        'Researched deterministic fixed-timestep physics loops and zero-allocation vector math for browser-embedded simulations.',
      outcomes: [
        'Published benchmark suite comparing WebAssembly vs. typed-array JS solvers.',
        'Delivered open-source starter templates adopted across two undergraduate graphics courses.',
      ],
      stack: ['WebAssembly', 'Three.js', 'TypedArrays', 'Benchmarking'],
    },
  ],
  skills: [
    {
      category: 'Frontend & 3D Graphics',
      items: [
        { name: 'React / TypeScript', level: 'Production' },
        { name: 'Three.js / WebGL2 / GLSL', level: 'Specialized' },
        { name: 'Tailwind CSS / Editorial UI', level: 'Production' },
        { name: 'SSR & Core Web Vitals', level: 'Specialized' },
      ],
    },
    {
      category: 'Backend & Infrastructure',
      items: [
        { name: 'Node.js / Express / Next.js', level: 'Production' },
        { name: 'REST APIs & Caching Proxies', level: 'Production' },
        { name: 'Docker / Caddy / Self-Hosting', level: 'Practical' },
        { name: 'SQLite / PostgreSQL', level: 'Practical' },
      ],
    },
    {
      category: 'Systems & Core CS',
      items: [
        { name: 'Rust & C++', level: 'Academic / Lab' },
        { name: 'Compilers & Parsers', level: 'Academic' },
        { name: 'Linear Algebra & Kinematics', level: 'Specialized' },
        { name: 'Technical Documentation', level: 'Daily Practice' },
      ],
    },
  ],
  posts: [
    {
      id: 'post-1',
      slug: 'zero-cms-portfolio-architecture',
      kind: 'blog',
      title: 'Designing a Zero-CMS Engineering Portfolio with GitHub Sync & SSR Metadata',
      summary:
        'Why replacing heavyweight CMS databases with structured Markdown, live GitHub REST caching, and server-injected JSON-LD yields faster builds and effortless long-term maintenance.',
      markdownBody: `## Why Leave Traditional CMS Platforms Behind

Most developer portfolios start simple and slowly accumulate database migrations, rich-text plugin bloat, and stale project descriptions that never match what is actually shipping on GitHub.

By splitting responsibilities cleanly, maintenance drops to zero:

1. **Live Source of Truth on GitHub**: Repository titles, descriptions, star counts, primary languages, and README documentation sync directly from the GitHub REST API through a cached server proxy.
2. **Local Markdown & JSON Authoring**: Long-form technical essays and documentation live in clean, version-controlled Markdown edited from an authenticated local-only admin site.
3. **Server-Injected SEO**: Every article route injects dedicated \`<title>\`, OpenGraph cards, canonical URLs, and \`BlogPosting\` JSON-LD before hydration.

### Proxy Caching Pattern

\`\`\`ts
// Five-minute in-memory cache prevents client IP rate exhaustion
const cache = new Map<string, { expiresAt: number; payload: unknown }>();

export async function fetchGitHubCached(url: string) {
  const hit = cache.get(url);
  if (hit && hit.expiresAt > Date.now()) return hit.payload;
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  const data = await res.json();
  cache.set(url, { expiresAt: Date.now() + 300_000, payload: data });
  return data;
}
\`\`\`

### Key Takeaways

- Keep secrets, admin mutations, and GitHub tokens strictly on the server.
- Pair fast static bundling with server-injected structured data for search discoverability.
- Treat your portfolio as an engineering laboratory rather than a static brochure.`,
      tags: ['Architecture', 'SEO', 'GitHub API'],
      publishedAt: '2026-10-18',
      updatedAt: '2026-11-12',
      readingTimeMinutes: 4,
      coverImageUrl: '/src/assets/images/blog_distributed_systems_1795420575949.jpg',
      seoTitle: 'Zero-CMS Portfolio Architecture with GitHub Sync & SSR Metadata',
      seoDescription:
        'How to build an SEO-optimized engineering portfolio using live GitHub API sync, local Markdown authoring, and server-injected structured data.',
      published: true,
    },
    {
      id: 'post-2',
      slug: 'procedural-pbr-shaders-threejs',
      kind: 'doc',
      title: 'Technical Spec: Extending MeshStandardMaterial with onBeforeCompile & PMREM',
      summary:
        'Implementation guide for injecting animated vertex wave displacement into Three.js PBR materials while keeping shadows, ACES Filmic tone mapping, and studio RoomEnvironment reflections intact.',
      markdownBody: `## Extending PBR Without Losing Studio Lighting

Writing an unlit \`ShaderMaterial\` forces you to re-implement directional shadows, environment reflections, and tone mapping from scratch. Instead, inject custom GLSL directly into \`MeshStandardMaterial.onBeforeCompile\`.

### Core Pipeline Requirements

- Initialize a \`PMREMGenerator\` with \`RoomEnvironment\` so brushed metals and optical glass receive physically plausible specular highlights.
- Guard software WebGL environments (\`SwiftShader\`, \`llvmpipe\`) by capping pixel ratio to \`1.0\` and pacing continuous loops cleanly after GPU command sync.
- Pre-allocate reusable \`Vector3\` and \`Matrix4\` instances outside \`requestAnimationFrame\` to eliminate garbage collection stutter.

\`\`\`ts
material.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = uniforms.uTime;
  shader.uniforms.uAmplitude = uniforms.uAmplitude;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\\nuniform float uTime;\\nuniform float uAmplitude;')
    .replace(
      '#include <begin_vertex>',
      \`#include <begin_vertex>
       transformed.y += sin(transformed.x * 1.4 + uTime) * cos(transformed.z * 1.4 + uTime) * uAmplitude;\`
    );
};
\`\`\`

### Performance Budget

Keep interactive viewports under 3 shadow-casting lights and mount the WebGL canvas inside an isolated React \`useRef\` container so HUD state changes never re-create the WebGL context.`,
      tags: ['Three.js', 'GLSL', 'WebGL2'],
      publishedAt: '2026-09-29',
      updatedAt: '2026-11-04',
      readingTimeMinutes: 5,
      coverImageUrl: '/src/assets/images/blog_webgl_shaders_1795420577437.jpg',
      seoTitle: 'Extending Three.js MeshStandardMaterial with onBeforeCompile',
      seoDescription:
        'Technical documentation on preserving PBR studio reflections and shadows while injecting custom vertex shaders in Three.js.',
      published: true,
    },
    {
      id: 'post-3',
      slug: 'self-hosting-developer-sandboxes',
      kind: 'doc',
      title: 'Runbook: Exposing Self-Hosted Mini-Games & Developer Utilities Safely',
      summary:
        'Operational checklist for routing self-hosted tools, WebAssembly playgrounds, and mini-games behind reverse proxies with clean health boundaries and portfolio embeds.',
      markdownBody: `## Organizing Self-Hosted Utilities

A personal curriculum becomes far more compelling when hiring engineers can actually run your utilities and mini-games instead of reading bullet points.

### Service Topology

1. **Native Browser Sandboxes**: Self-contained WebGL mini-games and client-side developer utilities run directly inside the portfolio sandbox with zero external network latency.
2. **Self-Hosted Subdomains**: Long-running backend services (Git mirrors, telemetry dashboards, container sandboxes) sit behind clean HTTPS subdomains with explicit health links.

### Checklist Before Linking a Service

- Verify CORS and Content-Security-Policy framing rules before toggling \`iframe\` preview mode.
- Validate all external links to permit strictly \`http:\` and \`https:\` protocols.
- Document tech stack, latency constraints, and source repository alongside every hosted utility.`,
      tags: ['Self-Hosting', 'DevOps', 'Sandboxes'],
      publishedAt: '2026-08-14',
      updatedAt: '2026-10-22',
      readingTimeMinutes: 3,
      coverImageUrl: '/src/assets/images/project_hardware_lab_1795420575317.jpg',
      seoTitle: 'Self-Hosting Developer Utilities & Portfolio Sandboxes',
      seoDescription:
        'Operational runbook for linking and embedding self-hosted tools, mini-games, and web services inside a developer portfolio.',
      published: true,
    },
  ],
  services: [
    {
      id: 'srv-1',
      name: 'Vector Dodge 3D',
      category: 'mini-game',
      description:
        'Playable Three.js WebGL arcade mini-game piloting a procedural articulated glider through obsidian monolith fields with real-time score tracking.',
      externalUrl: 'https://labs.diegotrocker.dev/vector-dodge',
      coverImageUrl: '/src/assets/images/service_vector_dodge_1795421418983.jpg',
      embedMode: 'native-lab',
      nativeLabId: 'vector-dodge',
      techStack: ['Three.js', 'WebGL2', 'Fixed-Timestep Loop'],
      hostLabel: 'Embedded WebGL Lab',
    },
    {
      id: 'srv-2',
      name: 'Dev Workbench Utility',
      category: 'utility',
      description:
        'Zero-dependency browser utility for JSON formatting & validation, live Regex match highlighting, and Base64/JWT payload inspection.',
      externalUrl: 'https://tools.diegotrocker.dev/workbench',
      coverImageUrl: '/src/assets/images/service_dev_workbench_1795421419179.jpg',
      embedMode: 'native-lab',
      nativeLabId: 'dev-workbench',
      techStack: ['TypeScript', 'Pure Client Parser', 'Zero Server Logging'],
      hostLabel: 'Embedded Tool Sandbox',
    },
    {
      id: 'srv-3',
      name: 'Self-Hosted Forgejo Git Mirror',
      category: 'service',
      description:
        'Personal self-hosted Git forge and CI runner container mirroring private hardware firmware experiments and homelab Ansible playbooks.',
      externalUrl: 'https://github.com/DiegoTrocker',
      coverImageUrl: '/src/assets/images/service_git_forge_1795421419323.jpg',
      embedMode: 'external-only',
      techStack: ['Docker', 'Caddy TLS', 'Linux'],
      hostLabel: 'git.diegotrocker.dev',
    },
    {
      id: 'srv-4',
      name: 'Shader & Terrain Telemetry Playground',
      category: 'utility',
      description:
        'Real-time GLSL wave terrain and instanced particle attractor inspector wired into the 3D Project Lab.',
      externalUrl: 'https://shaders.diegotrocker.dev',
      coverImageUrl: '/src/assets/images/service_shader_playground_1795421419624.jpg',
      embedMode: 'external-only',
      techStack: ['GLSL', 'PMREM', 'InstancedMesh'],
      hostLabel: 'shaders.diegotrocker.dev',
    },
  ],
  featuredDemos: [
    {
      repoName: 'three.js',
      labPresetId: 'wave-terrain',
      demoLabel: 'Launch 3D Wave Shader Lab',
    },
    {
      repoName: 'frame.js',
      labPresetId: 'orbital-swarm',
      demoLabel: 'Launch Orbital Kinematics',
    },
  ],
};
