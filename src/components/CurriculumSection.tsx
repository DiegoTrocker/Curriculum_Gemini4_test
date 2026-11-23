import { useState } from 'react';
import type { CurriculumItem, MilestoneKind, SkillGroup } from '../types/portfolio.ts';

interface CurriculumSectionProps {
  curriculum: CurriculumItem[];
  skills: SkillGroup[];
}

export function CurriculumSection({ curriculum, skills }: CurriculumSectionProps) {
  const [filter, setFilter] = useState<'all' | MilestoneKind>('all');

  const filtered =
    filter === 'all' ? curriculum : curriculum.filter((item) => item.kind === filter);

  return (
    <section id="curriculum" className="border-t border-zinc-200/80 py-16 dark:border-slate-800/80">
      <div className="flex flex-wrap items-end justify-between gap-6 rounded-2xl border border-zinc-200/80 bg-white/90 p-6 dark:border-slate-800/80 dark:bg-slate-900/88">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400">
            01. Curriculum Vitae
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Academic Accomplishments &amp; Internships
          </h2>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-slate-800">
          {(
            [
              { id: 'all', label: 'All Milestones' },
              { id: 'internship', label: 'Internships' },
              { id: 'academic', label: 'Academic & Research' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white text-zinc-950 shadow-xs dark:bg-slate-950 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hairline-divided Swiss Grid Timeline */}
      <div className="mt-8 divide-y divide-zinc-200 rounded-2xl border border-zinc-200/80 bg-white/92 px-6 dark:divide-slate-800 dark:border-slate-800/80 dark:bg-slate-900/90">
        {filtered.length === 0 ? (
          <div className="py-10 text-sm text-zinc-500 dark:text-zinc-400">
            No milestones in this category yet. Add entries via the private /admin portal.
          </div>
        ) : (
          filtered.map((item) => (
            <article
              key={item.id}
              className="grid grid-cols-1 gap-6 py-8 md:grid-cols-12 md:gap-8"
            >
              <div className="md:col-span-4">
                <p className="font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {item.period}
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {item.organization}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {item.kind === 'academic' ? 'Academic Track' : 'Industry Internship'} · {item.location}
                </p>
              </div>

              <div className="md:col-span-8">
                <h3 className="font-display text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                  {item.title}
                </h3>
                <p className="mt-2 max-w-[65ch] text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {item.summary}
                </p>

                {item.outcomes.length > 0 && (
                  <ul className="mt-4 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                    {item.outcomes.map((out, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
                        <span>{out}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {item.stack.length > 0 && (
                  <p className="mt-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {item.stack.join(' · ')}
                  </p>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {/* Technical Capabilities Matrix */}
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
        {skills.map((group) => (
          <div
            key={group.category}
            className="rounded-xl border border-zinc-200/90 bg-white/92 p-6 dark:border-slate-800/90 dark:bg-slate-900/90"
          >
            <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
              {group.category}
            </h3>
            <dl className="mt-4 divide-y divide-zinc-100 dark:divide-slate-800">
              {group.items.map((skill) => (
                <div key={skill.name} className="flex items-center justify-between py-2.5 text-sm">
                  <dt className="text-zinc-800 dark:text-zinc-200">{skill.name}</dt>
                  <dd className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{skill.level}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
