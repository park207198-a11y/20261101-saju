import { Lunar, LunarMonth, LunarYear } from 'lunar-javascript';
import { MIN_BIRTH_YEAR } from '../../constants';
import type { BirthInput } from '../../types/saju';

function daysInSolarMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 음력 → 양력. 존재하지 않는 날짜면 null. */
export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  isLeap: boolean,
): { year: number; month: number; day: number } | null {
  if (isLeap && LunarYear.fromYear(year).getLeapMonth() !== month) return null;
  const m = isLeap ? -month : month;
  const lm = LunarMonth.fromYm(year, m);
  if (!lm || day < 1 || day > lm.getDayCount()) return null;
  const s = Lunar.fromYmd(year, m, day).getSolar();
  return { year: s.getYear(), month: s.getMonth(), day: s.getDay() };
}

/** 입력 검증. 문제가 없으면 null, 있으면 사용자에게 보여줄 한국어 메시지. */
export function validateBirth(input: BirthInput, now: Date = new Date()): string | null {
  const { year, month, day, hour, minute } = input;
  if (![year, month, day].every(Number.isInteger)) return '생년월일을 모두 입력해 주세요.';
  if (year < MIN_BIRTH_YEAR) return `${MIN_BIRTH_YEAR}년 이후 출생만 지원합니다.`;
  if (month < 1 || month > 12) return '월은 1~12 사이여야 합니다.';
  if (day < 1) return '일을 올바르게 입력해 주세요.';

  if (hour !== null) {
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return '시는 0~23 사이여야 합니다.';
    if (minute !== null && (!Number.isInteger(minute) || minute < 0 || minute > 59))
      return '분은 0~59 사이여야 합니다.';
  }

  let solar = { year, month, day };
  if (input.calendar === 'lunar') {
    const converted = lunarToSolar(year, month, day, input.isLeapMonth);
    if (!converted) {
      return input.isLeapMonth
        ? '해당 연도·월에는 윤달이 없거나 날짜가 올바르지 않습니다.'
        : '존재하지 않는 음력 날짜입니다.';
    }
    solar = converted;
  } else if (day > daysInSolarMonth(year, month)) {
    return '존재하지 않는 양력 날짜입니다.';
  }

  const birth = Date.UTC(
    solar.year,
    solar.month - 1,
    solar.day,
    hour ?? 0,
    hour === null ? 0 : (minute ?? 0),
  );
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const nowLocal = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
  );
  if (hour === null ? birth > today : birth > nowLocal) return '미래 날짜는 입력할 수 없습니다.';
  return null;
}
