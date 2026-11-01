import type { Reading } from '../types/reading';
import type { SajuResult } from '../types/saju';

export interface SectionDef {
  id: string;
  label: string;
  title: string;
  key: 'overall' | 'wealth' | 'love' | 'business' | 'career' | 'health' | 'relationships';
}

export const SECTIONS: readonly SectionDef[] = [
  { id: 'wealth', label: '재물운', title: '재물운', key: 'wealth' },
  { id: 'love', label: '연애·결혼', title: '연애·결혼운', key: 'love' },
  { id: 'business', label: '사업운', title: '사업운', key: 'business' },
  { id: 'career', label: '직업·명예', title: '직업·명예운', key: 'career' },
  { id: 'health', label: '건강운', title: '건강운', key: 'health' },
  { id: 'relationships', label: '대인관계', title: '대인관계·귀인운', key: 'relationships' },
];

/** 클립보드 복사용 일반 텍스트 */
export function readingToText(saju: SajuResult, r: Reading): string {
  const p = saju.pillars;
  const pillarLine = [p.hour?.ganzhi ?? '미상', p.day.ganzhi, p.month.ganzhi, p.year.ganzhi].join(
    ' ',
  );
  const lines: string[] = [
    `[사주 풀이] ${saju.input.name ? saju.input.name + ' · ' : ''}${saju.solar.year}.${saju.solar.month}.${saju.solar.day} (${saju.lunarText})`,
    `사주(시일월년): ${pillarLine}${saju.hourKnown ? '' : ' (태어난 시간 모름 - 삼주 풀이)'}`,
    '',
    `■ 총평: ${r.summary}`,
    '',
    `■ 성격 - ${r.personality.title} (${r.personality.score}점)\n${r.personality.detail}`,
    '',
    `■ 타고난 사주 (${r.overall.score}점)\n${r.overall.detail}`,
  ];
  for (const s of SECTIONS.filter((x) => x.key !== 'overall')) {
    const sec = r[s.key];
    lines.push('', `■ ${s.title} (${sec.score}점)\n${sec.detail}`);
  }
  lines.push(
    '',
    `■ ${r.currentYear.year}년 운세 (${r.currentYear.score}점)\n${r.currentYear.detail}`,
    '',
    '■ 월별 흐름',
    ...r.monthly.map((m) => `${m.month}월 (${m.score}점): ${m.note}`),
    '',
    '■ 대운',
    ...r.daeun.map((d) => `${d.ageRange} - ${d.theme}\n${d.detail}`),
    '',
    `■ 행운 아이템: 색 ${r.luckyItems.color} / 방향 ${r.luckyItems.direction} / 숫자 ${r.luckyItems.number} / 오행 ${r.luckyItems.element}`,
    '',
    `■ 종합 조언\n${r.advice}`,
    '',
    '본 풀이는 재미와 참고용이며 의학·재무·법률적 조언이 아닙니다',
  );
  return lines.join('\n');
}
