import { SECTIONS } from '../lib/readingText';
import type { Reading } from '../types/reading';
import ScoreGauge from './ScoreGauge';

function Para({ text }: { text: string }) {
  return <p className="whitespace-pre-line leading-7 text-stone-800 dark:text-stone-200">{text}</p>;
}

function Block({
  title,
  score,
  children,
}: {
  title: string;
  score?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold">{title}</h3>
        {score !== undefined && <ScoreGauge score={score} />}
      </div>
      {children}
    </section>
  );
}

export type TabId = 'summary' | (typeof SECTIONS)[number]['id'] | 'year' | 'daeun';

export const TABS: { id: TabId; label: string }[] = [
  { id: 'summary', label: '총운' },
  ...SECTIONS.map((s) => ({ id: s.id, label: s.label })),
  { id: 'year', label: '올해·월별' },
  { id: 'daeun', label: '대운' },
];

export function TabContent({ tab, reading: r }: { tab: TabId; reading: Reading }) {
  switch (tab) {
    case 'summary':
      return (
        <div className="space-y-6">
          <p className="rounded-xl bg-violet-50 p-4 text-base font-semibold leading-7 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
            “{r.summary}”
          </p>
          <Block title={`성격 · ${r.personality.title}`} score={r.personality.score}>
            <Para text={r.personality.detail} />
          </Block>
          <Block title="타고난 사주 구조" score={r.overall.score}>
            <Para text={r.overall.detail} />
          </Block>
          <Block title="행운 아이템">
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {(
                [
                  ['색', r.luckyItems.color],
                  ['방향', r.luckyItems.direction],
                  ['숫자', r.luckyItems.number],
                  ['보완 오행', r.luckyItems.element],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-stone-100 p-3 dark:bg-stone-800">
                  <dt className="text-xs text-stone-500 dark:text-stone-400">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Block>
          <Block title="종합 조언">
            <Para text={r.advice} />
          </Block>
        </div>
      );
    case 'year':
      return (
        <div className="space-y-6">
          <Block title={`${r.currentYear.year}년 운세`} score={r.currentYear.score}>
            <Para text={r.currentYear.detail} />
          </Block>
          <Block title="월별 흐름">
            <ul className="space-y-2">
              {[...r.monthly]
                .sort((a, b) => a.month - b.month)
                .map((m) => (
                  <li key={m.month} className="flex items-start gap-3 text-sm">
                    <span className="w-9 shrink-0 pt-0.5 font-semibold">{m.month}월</span>
                    <div className="min-w-0 flex-1">
                      <div className="h-2 overflow-hidden rounded bg-stone-200 dark:bg-stone-800">
                        <div
                          className="h-full rounded bg-violet-600"
                          style={{ width: `${m.score}%` }}
                          role="meter"
                          aria-valuenow={m.score}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${m.month}월 점수`}
                        />
                      </div>
                      <p className="mt-1 leading-6 text-stone-700 dark:text-stone-300">{m.note}</p>
                    </div>
                    <span className="w-8 shrink-0 text-right tabular-nums">{m.score}</span>
                  </li>
                ))}
            </ul>
          </Block>
        </div>
      );
    case 'daeun':
      return (
        <div className="space-y-5">
          {r.daeun.map((d, i) => (
            <Block key={i} title={`${d.ageRange} · ${d.theme}`}>
              <Para text={d.detail} />
            </Block>
          ))}
        </div>
      );
    default: {
      const def = SECTIONS.find((s) => s.id === tab);
      if (!def) return null;
      const sec = r[def.key];
      return (
        <Block title={def.title} score={sec.score}>
          <Para text={sec.detail} />
        </Block>
      );
    }
  }
}

/** 이미지 저장용: 모든 섹션을 한 번에 렌더링한다. */
export function FullReading({ reading }: { reading: Reading }) {
  return (
    <div className="space-y-8">
      {TABS.map((t) => (
        <div key={t.id}>
          <h2 className="mb-3 border-b border-stone-300 pb-1 text-lg font-bold dark:border-stone-700">
            {t.label}
          </h2>
          <TabContent tab={t.id} reading={reading} />
        </div>
      ))}
    </div>
  );
}
