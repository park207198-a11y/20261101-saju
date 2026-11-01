import { ELEMENT_COLORS, ELEMENT_HANJA } from '../constants';
import { ELEMENT_ORDER } from '../lib/saju/tables';
import type { Element, Pillar, SajuResult } from '../types/saju';

function Char({ ch, ko, element }: { ch: string; ko: string; element: Element }) {
  return (
    <div
      className="mx-auto flex size-14 flex-col items-center justify-center rounded-xl text-white sm:size-20"
      style={{ backgroundColor: ELEMENT_COLORS[element] }}
      aria-label={`${ko} ${element}`}
    >
      <span className="text-2xl font-bold leading-none sm:text-3xl">{ch}</span>
      <span className="mt-1 text-xs opacity-90">
        {ko}·{element}
      </span>
    </div>
  );
}

const rowLabel = 'py-1 pr-2 text-left text-xs font-medium text-stone-500 dark:text-stone-400';

function PillarTable({ saju }: { saju: SajuResult }) {
  const cols: { label: string; pillar: Pillar | null }[] = [
    { label: '시주', pillar: saju.pillars.hour },
    { label: '일주', pillar: saju.pillars.day },
    { label: '월주', pillar: saju.pillars.month },
    { label: '년주', pillar: saju.pillars.year },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[18rem] border-separate border-spacing-y-1 text-center text-sm">
        <thead>
          <tr>
            <th className="w-10" />
            {cols.map((c) => (
              <th
                key={c.label}
                className="pb-1 text-xs font-semibold text-stone-600 dark:text-stone-300"
              >
                {c.label}
                {c.label === '일주' && <span className="ml-1 text-violet-600">(나)</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className={rowLabel}>
              십성
            </th>
            {cols.map((c) => (
              <td key={c.label}>{c.pillar ? c.pillar.tenGodGan : '-'}</td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={rowLabel}>
              천간
            </th>
            {cols.map((c) => (
              <td key={c.label}>
                {c.pillar ? (
                  <Char ch={c.pillar.gan} ko={c.pillar.ganKo} element={c.pillar.ganElement} />
                ) : (
                  <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-dashed border-stone-400 text-xs text-stone-500 sm:size-20">
                    미상
                  </div>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={rowLabel}>
              지지
            </th>
            {cols.map((c) => (
              <td key={c.label}>
                {c.pillar ? (
                  <Char ch={c.pillar.zhi} ko={c.pillar.zhiKo} element={c.pillar.zhiElement} />
                ) : (
                  <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-dashed border-stone-400 text-xs text-stone-500 sm:size-20">
                    미상
                  </div>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={rowLabel}>
              십성
            </th>
            {cols.map((c) => (
              <td key={c.label}>{c.pillar ? c.pillar.tenGodZhi : '-'}</td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={rowLabel}>
              지장간
            </th>
            {cols.map((c) => (
              <td key={c.label} className="text-xs text-stone-600 dark:text-stone-400">
                {c.pillar ? c.pillar.hiddenStems.map((h) => h.ganKo).join(' ') : '-'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ElementBars({ saju }: { saju: SajuResult }) {
  const max = Math.max(1, ...ELEMENT_ORDER.map((e) => saju.elements[e]));
  return (
    <div className="space-y-2" role="img" aria-label="오행 분포 차트">
      {ELEMENT_ORDER.map((e) => {
        const n = saju.elements[e];
        return (
          <div key={e} className="flex items-center gap-2 text-sm">
            <span className="w-10 shrink-0 font-medium">
              {e}
              <span className="ml-0.5 text-xs text-stone-500">{ELEMENT_HANJA[e]}</span>
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-stone-200 dark:bg-stone-800">
              <div
                className="h-full rounded transition-all"
                style={{ width: `${(n / max) * 100}%`, backgroundColor: ELEMENT_COLORS[e] }}
              />
            </div>
            <span className="w-6 text-right tabular-nums">{n}</span>
          </div>
        );
      })}
      {saju.missingElements.length > 0 && (
        <p className="text-xs text-stone-600 dark:text-stone-400">
          부족한 오행: {saju.missingElements.join(', ')}
        </p>
      )}
    </div>
  );
}

function DaeunStrip({ saju }: { saju: SajuResult }) {
  const { daeun } = saju;
  return (
    <div>
      <p className="mb-2 text-xs text-stone-600 dark:text-stone-400">
        {daeun.forward ? '순행' : '역행'} 대운 · {daeun.startsAfter.years}년{' '}
        {daeun.startsAfter.months}
        개월 후({daeun.startDate}) 시작 · 현재 {daeun.currentAge}세(세는나이)
      </p>
      <ol className="flex gap-2 overflow-x-auto pb-2">
        {daeun.periods.map((p, i) => {
          const current = i === daeun.currentIndex;
          return (
            <li
              key={p.ganzhi + p.startAge}
              className={`w-20 shrink-0 rounded-lg border p-2 text-center text-xs ${
                current
                  ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/60'
                  : 'border-stone-200 dark:border-stone-700'
              }`}
            >
              <div className="text-lg font-bold">{p.ganzhi}</div>
              <div>{p.ganzhiKo}</div>
              <div className="mt-1 text-stone-500">
                {p.startAge}~{p.endAge}세
              </div>
              {current && (
                <div className="mt-1 font-semibold text-violet-700 dark:text-violet-300">현재</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function SajuChart({ saju }: { saju: SajuResult }) {
  return (
    <section className="card space-y-5" aria-label="사주 원국">
      <div>
        <h2 className="text-lg font-bold">
          {saju.input.name ? `${saju.input.name}님의 사주` : '사주 원국'}
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          양력 {saju.solar.year}.{saju.solar.month}.{saju.solar.day} · {saju.lunarText} ·{' '}
          {saju.input.gender === 'male' ? '남' : '여'} · 일간 {saju.dayMaster.gan}(
          {saju.dayMaster.ganKo}
          {saju.dayMaster.element})
        </p>
        {!saju.hourKnown && (
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            태어난 시간을 몰라 삼주(년·월·일)만으로 풀이합니다.
          </p>
        )}
      </div>
      <PillarTable saju={saju} />
      <div>
        <h3 className="mb-2 text-sm font-semibold">오행 분포</h3>
        <ElementBars saju={saju} />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold">
          대운 · {saju.seyun.year}년 세운 {saju.seyun.ganzhi}({saju.seyun.ganzhiKo})
        </h3>
        <DaeunStrip saju={saju} />
      </div>
    </section>
  );
}
