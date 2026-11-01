export type Element = '목' | '화' | '토' | '금' | '수';
export type YinYang = '양' | '음';
export type TenGod =
  '비견' | '겁재' | '식신' | '상관' | '편재' | '정재' | '편관' | '정관' | '편인' | '정인';
export type Gender = 'male' | 'female';
export type CalendarType = 'solar' | 'lunar';

/** 자시(23:00~00:59) 처리 방식. next-day: 23시부터 다음 날로 계산(정자시), same-day: 당일 유지(야자시). */
export type ZiMode = 'next-day' | 'same-day';

export interface BirthInput {
  name?: string;
  gender: Gender;
  calendar: CalendarType;
  /** 음력일 때만 의미 있음 */
  isLeapMonth: boolean;
  year: number;
  month: number;
  day: number;
  /** null이면 태어난 시간 모름 */
  hour: number | null;
  minute: number | null;
  birthplace?: string;
  ziMode: ZiMode;
}

export interface HiddenStem {
  gan: string;
  ganKo: string;
  element: Element;
  tenGod: TenGod;
}

export interface Pillar {
  /** 예: 庚午 */
  ganzhi: string;
  /** 예: 경오 */
  ganzhiKo: string;
  gan: string;
  zhi: string;
  ganKo: string;
  zhiKo: string;
  ganElement: Element;
  zhiElement: Element;
  ganYinYang: YinYang;
  zhiYinYang: YinYang;
  /** 일주의 천간은 일간(본인)이므로 '일간' */
  tenGodGan: TenGod | '일간';
  /** 지지의 십성은 지장간 본기 기준 */
  tenGodZhi: TenGod;
  /** 본기 → 중기 → 여기 순서 */
  hiddenStems: HiddenStem[];
}

export interface DaeunPeriod {
  ganzhi: string;
  ganzhiKo: string;
  /** 세는나이 기준 */
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  tenGodGan: TenGod;
  tenGodZhi: TenGod;
}

export interface MonthlyPillar {
  /** 양력 월 (해당 월 중순 기준의 월주) */
  month: number;
  ganzhi: string;
  ganzhiKo: string;
  tenGodGan: TenGod;
  tenGodZhi: TenGod;
}

export interface SajuResult {
  input: BirthInput;
  /** 계산에 사용한 양력 생년월일 */
  solar: { year: number; month: number; day: number };
  lunarText: string;
  hourKnown: boolean;
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
  dayMaster: { gan: string; ganKo: string; element: Element; yinYang: YinYang };
  /** 천간+지지 글자 수 기준 (시주 모름이면 6글자) */
  elements: Record<Element, number>;
  missingElements: Element[];
  daeun: {
    forward: boolean;
    /** 대운 시작까지의 기간 */
    startsAfter: { years: number; months: number; days: number };
    startDate: string;
    periods: DaeunPeriod[];
    currentIndex: number;
    /** 세는나이 */
    currentAge: number;
  };
  seyun: {
    year: number;
    ganzhi: string;
    ganzhiKo: string;
    tenGodGan: TenGod;
    tenGodZhi: TenGod;
    months: MonthlyPillar[];
  };
}
