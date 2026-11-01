/**
 * 사주팔자 결정론적 계산 (UI 비의존 순수 함수).
 *
 * 절기·음력 데이터는 lunar-javascript를 사용하며, 이 파일은 그 위에서 기둥 조립·십성·오행·대운을 계산한다.
 *
 * [알려진 한계]
 * - 시각은 한국 표준시(KST)로 간주한다. 라이브러리의 절기 시각은 UTC+8(베이징) 기준이라
 *   입력 시각에서 1시간을 빼서 절기 판정에 사용한다.
 * - 역사적 시간대 변화(1908~1911 UTC+8:30, 1912~1953 UTC+9, 1954~1961 UTC+8:30, 1948~1951·1955~1960·
 *   1987~1988 서머타임)와 동경 127.5° 지방시(약 -30분) 보정은 적용하지 않는다.
 *   절기 경계·자시·시주 경계 부근 출생자는 결과가 실제와 달라질 수 있다.
 * - 태어난 시간을 모르면 정오(12:00)로 간주해 년·월·일주를 구하므로 절기 당일 출생은 월주가 부정확할 수 있다.
 * - 자시(23:00~00:59)는 ZiMode로 선택한다: next-day(23시부터 다음 날 일주) / same-day(야자시, 당일 일주 유지).
 * - 대운 나이는 세는나이(한국식) 기준이다. 대운 시작 시점은 라이브러리의 "3일=1년" 환산을 따른다.
 * - 지장간 배분, 신강/신약·격국·용신 판단은 유파별 차이가 크므로 여기서 확정하지 않는다.
 */
import { Lunar, Solar } from 'lunar-javascript';
import type {
  BirthInput,
  DaeunPeriod,
  Element,
  HiddenStem,
  MonthlyPillar,
  Pillar,
  SajuResult,
} from '../../types/saju';
import {
  BRANCHES,
  ELEMENT_ORDER,
  STEMS,
  branchElement,
  branchKo,
  branchYinYang,
  hiddenStemsOf,
  stemElement,
  stemIndex,
  stemKo,
  stemYinYang,
  tenGodOf,
} from './tables';
import { lunarToSolar, validateBirth } from './validate';

const HOUR_MS = 3_600_000;

function buildPillar(ganzhi: string, dayMaster: string, isDay: boolean): Pillar {
  const [gan, zhi] = [...ganzhi];
  const hiddenStems: HiddenStem[] = hiddenStemsOf(zhi).map((h) => ({
    gan: h,
    ganKo: stemKo(h),
    element: stemElement(h),
    tenGod: tenGodOf(dayMaster, h),
  }));
  return {
    ganzhi,
    ganzhiKo: stemKo(gan) + branchKo(zhi),
    gan,
    zhi,
    ganKo: stemKo(gan),
    zhiKo: branchKo(zhi),
    ganElement: stemElement(gan),
    zhiElement: branchElement(zhi),
    ganYinYang: stemYinYang(gan),
    zhiYinYang: branchYinYang(zhi),
    tenGodGan: isDay ? '일간' : tenGodOf(dayMaster, gan),
    tenGodZhi: tenGodOf(dayMaster, hiddenStemsOf(zhi)[0]),
    hiddenStems,
  };
}

/** 날짜(정오 기준)의 일주. 월 오버플로는 Date.UTC가 정규화한다. */
function dayGanzhiOf(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month - 1, day));
  return Solar.fromYmdHms(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 12, 0, 0)
    .getLunar()
    .getDayInGanZhi();
}

/** 五鼠遁: 일간으로부터 시간(時干) 결정 */
function hourGanzhi(dayGan: string, hour: number): string {
  const b = Math.floor(((hour + 1) % 24) / 2);
  const s = ((stemIndex(dayGan) % 5) * 2 + b) % 10;
  return STEMS[s] + BRANCHES[b];
}

function toSolarDate(input: BirthInput): { year: number; month: number; day: number } {
  if (input.calendar === 'solar') return { year: input.year, month: input.month, day: input.day };
  const s = lunarToSolar(input.year, input.month, input.day, input.isLeapMonth);
  if (!s) throw new Error('존재하지 않는 음력 날짜입니다.');
  return s;
}

export function calculateSaju(input: BirthInput, now: Date = new Date()): SajuResult {
  const err = validateBirth(input, now);
  if (err) throw new Error(err);

  const solar = toSolarDate(input);
  const hourKnown = input.hour !== null;
  const hour = input.hour ?? 12;
  const minute = hourKnown ? (input.minute ?? 0) : 0;

  // 절기 판정용: KST → UTC+8 (라이브러리 기준)
  const shifted = new Date(
    Date.UTC(solar.year, solar.month - 1, solar.day, hour, minute) - HOUR_MS,
  );
  const ec = Solar.fromYmdHms(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    shifted.getUTCHours(),
    shifted.getUTCMinutes(),
    0,
  )
    .getLunar()
    .getEightChar();

  const yearGz = ec.getYear();
  const monthGz = ec.getMonth();

  const lateZi = hourKnown && hour === 23;
  const dayGz =
    lateZi && input.ziMode === 'next-day'
      ? dayGanzhiOf(solar.year, solar.month, solar.day + 1)
      : dayGanzhiOf(solar.year, solar.month, solar.day);
  const dayMaster = [...dayGz][0];
  const hourGz = hourKnown ? hourGanzhi(dayMaster, hour) : null;

  const pillars = {
    year: buildPillar(yearGz, dayMaster, false),
    month: buildPillar(monthGz, dayMaster, false),
    day: buildPillar(dayGz, dayMaster, true),
    hour: hourGz ? buildPillar(hourGz, dayMaster, false) : null,
  };

  const elements: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
    if (!p) continue;
    elements[p.ganElement] += 1;
    elements[p.zhiElement] += 1;
  }
  const missingElements = ELEMENT_ORDER.filter((e) => elements[e] === 0);

  // 대운
  const nowYear = now.getFullYear();
  const yun = ec.getYun(input.gender === 'male' ? 1 : 0);
  const periods: DaeunPeriod[] = yun
    .getDaYun()
    .filter((d) => d.getGanZhi() !== '')
    .slice(0, 9)
    .map((d) => {
      const gz = d.getGanZhi();
      const [g, z] = [...gz];
      return {
        ganzhi: gz,
        ganzhiKo: stemKo(g) + branchKo(z),
        startAge: d.getStartAge(),
        endAge: d.getEndAge(),
        startYear: d.getStartYear(),
        endYear: d.getEndYear(),
        tenGodGan: tenGodOf(dayMaster, g),
        tenGodZhi: tenGodOf(dayMaster, hiddenStemsOf(z)[0]),
      };
    });
  const currentAge = nowYear - solar.year + 1;
  const currentIndex = periods.findIndex((p) => nowYear >= p.startYear && nowYear <= p.endYear);

  // 세운
  const seyunGz = Solar.fromYmd(nowYear, 7, 1).getLunar().getYearInGanZhi();
  const [sg, sz] = [...seyunGz];
  const months: MonthlyPillar[] = Array.from({ length: 12 }, (_, i) => {
    const gz = Solar.fromYmd(nowYear, i + 1, 15)
      .getLunar()
      .getMonthInGanZhi();
    const [g, z] = [...gz];
    return {
      month: i + 1,
      ganzhi: gz,
      ganzhiKo: stemKo(g) + branchKo(z),
      tenGodGan: tenGodOf(dayMaster, g),
      tenGodZhi: tenGodOf(dayMaster, hiddenStemsOf(z)[0]),
    };
  });

  const lunar = Solar.fromYmd(solar.year, solar.month, solar.day).getLunar();
  const lunarText = formatLunar(lunar);

  return {
    input,
    solar,
    lunarText,
    hourKnown,
    pillars,
    dayMaster: {
      gan: dayMaster,
      ganKo: stemKo(dayMaster),
      element: stemElement(dayMaster),
      yinYang: stemYinYang(dayMaster),
    },
    elements,
    missingElements,
    daeun: {
      forward: yun.isForward(),
      startsAfter: {
        years: yun.getStartYear(),
        months: yun.getStartMonth(),
        days: yun.getStartDay(),
      },
      startDate: yun.getStartSolar().toYmd(),
      periods,
      currentIndex,
      currentAge,
    },
    seyun: {
      year: nowYear,
      ganzhi: seyunGz,
      ganzhiKo: stemKo(sg) + branchKo(sz),
      tenGodGan: tenGodOf(dayMaster, sg),
      tenGodZhi: tenGodOf(dayMaster, hiddenStemsOf(sz)[0]),
      months,
    },
  };
}

function formatLunar(lunar: Lunar): string {
  const m = lunar.getMonth();
  return `음력 ${lunar.getYear()}년 ${m < 0 ? '윤' : ''}${Math.abs(m)}월 ${lunar.getDay()}일`;
}
