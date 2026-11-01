import { describe, expect, it } from 'vitest';
import { calculateSaju, lunarToSolar, tenGodOf, validateBirth } from './index';
import type { BirthInput } from '../../types/saju';

const NOW = new Date(2026, 10, 1, 12, 0); // 2026-11-01

function solar(
  y: number,
  m: number,
  d: number,
  h: number | null = 12,
  min: number | null = 0,
  extra: Partial<BirthInput> = {},
): BirthInput {
  return {
    gender: 'male',
    calendar: 'solar',
    isLeapMonth: false,
    year: y,
    month: m,
    day: d,
    hour: h,
    minute: h === null ? null : min,
    ziMode: 'next-day',
    ...extra,
  };
}

function gz(r: ReturnType<typeof calculateSaju>): string[] {
  const p = r.pillars;
  return [p.year.ganzhi, p.month.ganzhi, p.day.ganzhi, p.hour?.ganzhi ?? '-'];
}

describe('사주 4주 계산', () => {
  it('2000-01-01 12:00 → 己卯 丙子 戊午 戊午 (입춘 전이므로 기묘년)', () => {
    expect(gz(calculateSaju(solar(2000, 1, 1), NOW))).toEqual(['己卯', '丙子', '戊午', '戊午']);
  });

  it('1990-05-15 10:30 → 庚午 辛巳 庚辰 辛巳', () => {
    expect(gz(calculateSaju(solar(1990, 5, 15, 10, 30), NOW))).toEqual([
      '庚午',
      '辛巳',
      '庚辰',
      '辛巳',
    ]);
  });

  it('입춘 전(1984-02-02)은 전년도 癸亥년, 丑월', () => {
    const r = calculateSaju(solar(1984, 2, 2), NOW);
    expect(r.pillars.year.ganzhi).toBe('癸亥');
    expect(r.pillars.month.ganzhi).toBe('乙丑');
  });

  it('입춘 후(1984-02-05)는 甲子년, 丙寅월', () => {
    const r = calculateSaju(solar(1984, 2, 5), NOW);
    expect(r.pillars.year.ganzhi).toBe('甲子');
    expect(r.pillars.month.ganzhi).toBe('丙寅');
  });

  it('절기 경계: 2024 입춘(KST 17:27) 직전/직후', () => {
    const before = calculateSaju(solar(2024, 2, 4, 16, 0), NOW);
    expect([before.pillars.year.ganzhi, before.pillars.month.ganzhi]).toEqual(['癸卯', '乙丑']);
    // KST 17:15는 라이브러리(UTC+8)로는 16:15 → 입춘(16:27) 이전. KST→UTC+8 보정 검증.
    // (보정이 없다면 17:15 > 16:27 로 잘못 입춘 이후 판정이 나온다)
    const justBefore = calculateSaju(solar(2024, 2, 4, 17, 15), NOW);
    expect([justBefore.pillars.year.ganzhi, justBefore.pillars.month.ganzhi]).toEqual([
      '癸卯',
      '乙丑',
    ]);
    const after = calculateSaju(solar(2024, 2, 4, 17, 45), NOW);
    expect([after.pillars.year.ganzhi, after.pillars.month.ganzhi]).toEqual(['甲辰', '丙寅']);
  });

  it('자시 경계: 23:30 정자시(next-day)는 다음 날 일주, 시주 甲子', () => {
    const r = calculateSaju(solar(2000, 1, 1, 23, 30, { ziMode: 'next-day' }), NOW);
    expect(r.pillars.day.ganzhi).toBe('己未');
    expect(r.pillars.hour?.ganzhi).toBe('甲子');
  });

  it('자시 경계: 23:30 야자시(same-day)는 당일 일주 유지, 시주 壬子', () => {
    const r = calculateSaju(solar(2000, 1, 1, 23, 30, { ziMode: 'same-day' }), NOW);
    expect(r.pillars.day.ganzhi).toBe('戊午');
    expect(r.pillars.hour?.ganzhi).toBe('壬子');
  });

  it('자시 경계: 00:30은 당일 일주의 子시 壬子', () => {
    const r = calculateSaju(solar(2000, 1, 1, 0, 30), NOW);
    expect(r.pillars.day.ganzhi).toBe('戊午');
    expect(r.pillars.hour?.ganzhi).toBe('壬子');
  });

  it('시간 모름이면 시주가 없고 오행은 6글자만 센다', () => {
    const r = calculateSaju(solar(1990, 5, 15, null), NOW);
    expect(r.pillars.hour).toBeNull();
    expect(r.hourKnown).toBe(false);
    expect(Object.values(r.elements).reduce((a, b) => a + b, 0)).toBe(6);
  });
});

describe('오행·십성·지장간', () => {
  it('2000-01-01 12:00 오행 분포: 목1 화3 토3 금0 수1, 금 부족', () => {
    const r = calculateSaju(solar(2000, 1, 1), NOW);
    expect(r.elements).toEqual({ 목: 1, 화: 3, 토: 3, 금: 0, 수: 1 });
    expect(r.missingElements).toEqual(['금']);
  });

  it('일간 庚 기준 십성', () => {
    expect(tenGodOf('庚', '庚')).toBe('비견');
    expect(tenGodOf('庚', '辛')).toBe('겁재');
    expect(tenGodOf('庚', '壬')).toBe('식신');
    expect(tenGodOf('庚', '癸')).toBe('상관');
    expect(tenGodOf('庚', '甲')).toBe('편재');
    expect(tenGodOf('庚', '乙')).toBe('정재');
    expect(tenGodOf('庚', '丙')).toBe('편관');
    expect(tenGodOf('庚', '丁')).toBe('정관');
    expect(tenGodOf('庚', '戊')).toBe('편인');
    expect(tenGodOf('庚', '己')).toBe('정인');
  });

  it('1990-05-15 10:30 십성 배치와 지장간', () => {
    const p = calculateSaju(solar(1990, 5, 15, 10, 30), NOW).pillars;
    expect(p.year.tenGodGan).toBe('비견');
    expect(p.month.tenGodGan).toBe('겁재');
    expect(p.day.tenGodGan).toBe('일간');
    expect(p.day.hiddenStems.map((h) => h.gan)).toEqual(['戊', '乙', '癸']);
    expect(p.year.tenGodZhi).toBe('정관'); // 午 본기 丁 → 庚의 정관
  });
});

describe('대운·세운', () => {
  it('양남(庚午년생 남자)은 순행: 첫 대운 壬午, 시작 8세', () => {
    const r = calculateSaju(solar(1990, 5, 15, 10, 30), NOW);
    expect(r.daeun.forward).toBe(true);
    expect(r.daeun.periods[0].ganzhi).toBe('壬午');
    expect(r.daeun.periods[0].startAge).toBe(8);
    expect(r.daeun.periods[1].ganzhi).toBe('癸未');
  });

  it('양녀(庚午년생 여자)는 역행: 첫 대운 庚辰', () => {
    const r = calculateSaju(solar(1990, 5, 15, 10, 30, { gender: 'female' }), NOW);
    expect(r.daeun.forward).toBe(false);
    expect(r.daeun.periods[0].ganzhi).toBe('庚辰');
  });

  it('현재 대운은 현재 연도 기준으로 선택된다 (2026년, 1990년생)', () => {
    const r = calculateSaju(solar(1990, 5, 15, 10, 30), NOW);
    expect(r.daeun.currentAge).toBe(37);
    expect(r.daeun.periods[r.daeun.currentIndex].ganzhi).toBe('甲申'); // 28~37세 (2017~2026)
  });

  it('세운 연도는 now에서 동적으로 계산된다 (2026 丙午, 2030 庚戌)', () => {
    expect(calculateSaju(solar(1990, 5, 15), NOW).seyun.ganzhi).toBe('丙午');
    expect(calculateSaju(solar(1990, 5, 15), new Date(2030, 5, 1)).seyun.ganzhi).toBe('庚戌');
    expect(calculateSaju(solar(1990, 5, 15), NOW).seyun.months).toHaveLength(12);
  });
});

describe('음력 변환·검증', () => {
  it('음력 1990-04-21 → 양력 1990-05-15', () => {
    expect(lunarToSolar(1990, 4, 21, false)).toEqual({ year: 1990, month: 5, day: 15 });
  });

  it('음력 2023-01-01(설날) → 양력 2023-01-22', () => {
    expect(lunarToSolar(2023, 1, 1, false)).toEqual({ year: 2023, month: 1, day: 22 });
  });

  it('윤달: 음력 2020 윤4월 1일 → 양력 2020-05-23, 윤달 없는 달은 null', () => {
    expect(lunarToSolar(2020, 4, 1, true)).toEqual({ year: 2020, month: 5, day: 23 });
    expect(lunarToSolar(2020, 5, 1, true)).toBeNull();
  });

  it('음력 입력과 동일한 양력 입력의 사주가 같다', () => {
    const a = calculateSaju(solar(1990, 5, 15, 10, 30), NOW);
    const b = calculateSaju(solar(1990, 4, 21, 10, 30, { calendar: 'lunar' }), NOW);
    expect(gz(b)).toEqual(gz(a));
  });

  it('잘못된 날짜·미래 날짜를 차단한다', () => {
    expect(validateBirth(solar(2023, 2, 30), NOW)).toMatch(/존재하지 않는/);
    expect(validateBirth(solar(2023, 13, 1), NOW)).toMatch(/월/);
    expect(validateBirth(solar(2027, 1, 1), NOW)).toMatch(/미래/);
    expect(validateBirth(solar(2026, 11, 1, 23, 0), NOW)).toMatch(/미래/);
    expect(validateBirth(solar(1800, 1, 1), NOW)).toMatch(/1900/);
    expect(validateBirth(solar(2020, 4, 31, 12, 0, { calendar: 'lunar' }), NOW)).toMatch(/음력/);
    expect(validateBirth(solar(1990, 5, 15, 25, 0), NOW)).toMatch(/시/);
    expect(validateBirth(solar(1990, 5, 15), NOW)).toBeNull();
  });
});
