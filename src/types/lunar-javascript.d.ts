// lunar-javascript는 타입 선언을 제공하지 않아, 이 앱에서 사용하는 API만 최소 선언합니다.
declare module 'lunar-javascript' {
  export class Solar {
    static fromYmd(year: number, month: number, day: number): Solar;
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getLunar(): Lunar;
    toYmd(): string;
  }

  export class Lunar {
    /** month가 음수이면 윤달 */
    static fromYmd(year: number, month: number, day: number): Lunar;
    getSolar(): Solar;
    getEightChar(): EightChar;
    getYearInGanZhi(): string;
    getMonthInGanZhi(): string;
    getDayInGanZhi(): string;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
  }

  export class LunarYear {
    static fromYear(year: number): LunarYear;
    /** 윤달이 없으면 0 */
    getLeapMonth(): number;
  }

  export class LunarMonth {
    static fromYm(year: number, month: number): LunarMonth | null;
    getDayCount(): number;
  }

  export class EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getYun(gender: number): Yun;
  }

  export class Yun {
    isForward(): boolean;
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    getStartSolar(): Solar;
    getDaYun(): DaYun[];
  }

  export class DaYun {
    getGanZhi(): string;
    getStartAge(): number;
    getEndAge(): number;
    getStartYear(): number;
    getEndYear(): number;
  }
}
