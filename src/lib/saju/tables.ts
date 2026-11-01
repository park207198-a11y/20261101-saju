import type { Element, TenGod, YinYang } from '../../types/saju';

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export const BRANCHES = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const;
export const BRANCHES_KO = [
  '자',
  '축',
  '인',
  '묘',
  '진',
  '사',
  '오',
  '미',
  '신',
  '유',
  '술',
  '해',
] as const;

/** 상생 순서: 목 → 화 → 토 → 금 → 수 → 목 */
export const ELEMENT_ORDER: readonly Element[] = ['목', '화', '토', '금', '수'];

const BRANCH_ELEMENTS: readonly Element[] = [
  '수',
  '토',
  '목',
  '목',
  '토',
  '화',
  '화',
  '토',
  '금',
  '금',
  '토',
  '수',
];

/** 지장간(본기 → 중기 → 여기 순). 유파에 따라 일부 배분이 다를 수 있음. */
const HIDDEN_STEMS: readonly (readonly string[])[] = [
  ['癸'], // 子
  ['己', '癸', '辛'], // 丑
  ['甲', '丙', '戊'], // 寅
  ['乙'], // 卯
  ['戊', '乙', '癸'], // 辰
  ['丙', '庚', '戊'], // 巳
  ['丁', '己'], // 午
  ['己', '丁', '乙'], // 未
  ['庚', '壬', '戊'], // 申
  ['辛'], // 酉
  ['戊', '辛', '丁'], // 戌
  ['壬', '甲'], // 亥
];

export function stemIndex(gan: string): number {
  const i = (STEMS as readonly string[]).indexOf(gan);
  if (i < 0) throw new Error(`알 수 없는 천간: ${gan}`);
  return i;
}

export function branchIndex(zhi: string): number {
  const i = (BRANCHES as readonly string[]).indexOf(zhi);
  if (i < 0) throw new Error(`알 수 없는 지지: ${zhi}`);
  return i;
}

export function stemElement(gan: string): Element {
  return ELEMENT_ORDER[Math.floor(stemIndex(gan) / 2)];
}

export function stemYinYang(gan: string): YinYang {
  return stemIndex(gan) % 2 === 0 ? '양' : '음';
}

export function branchElement(zhi: string): Element {
  return BRANCH_ELEMENTS[branchIndex(zhi)];
}

/** 지지 자체의 음양(체 기준). 십성 계산에는 쓰지 않고 본기 천간을 쓴다. */
export function branchYinYang(zhi: string): YinYang {
  return branchIndex(zhi) % 2 === 0 ? '양' : '음';
}

export function hiddenStemsOf(zhi: string): readonly string[] {
  return HIDDEN_STEMS[branchIndex(zhi)];
}

export function stemKo(gan: string): string {
  return STEMS_KO[stemIndex(gan)];
}

export function branchKo(zhi: string): string {
  return BRANCHES_KO[branchIndex(zhi)];
}

/** 일간(day master) 기준으로 대상 천간의 십성을 구한다. */
export function tenGodOf(dayMaster: string, other: string): TenGod {
  const me = ELEMENT_ORDER.indexOf(stemElement(dayMaster));
  const you = ELEMENT_ORDER.indexOf(stemElement(other));
  const samePolarity = stemYinYang(dayMaster) === stemYinYang(other);
  const rel = (you - me + 5) % 5; // 0 비겁, 1 식상(내가 생), 2 재성(내가 극), 3 관성(나를 극), 4 인성(나를 생)
  switch (rel) {
    case 0:
      return samePolarity ? '비견' : '겁재';
    case 1:
      return samePolarity ? '식신' : '상관';
    case 2:
      return samePolarity ? '편재' : '정재';
    case 3:
      return samePolarity ? '편관' : '정관';
    default:
      return samePolarity ? '편인' : '정인';
  }
}
