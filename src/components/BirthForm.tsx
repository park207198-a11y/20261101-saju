import { useState, type FormEvent } from 'react';
import { validateBirth } from '../lib/saju';
import type { BirthInput, CalendarType, Gender, ZiMode } from '../types/saju';

interface Props {
  onSubmit: (input: BirthInput) => void;
}

const toInt = (s: string): number => (s.trim() === '' ? NaN : Number(s));

export default function BirthForm({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [calendar, setCalendar] = useState<CalendarType>('solar');
  const [leap, setLeap] = useState(false);
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hourUnknown, setHourUnknown] = useState(false);
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('0');
  const [place, setPlace] = useState('');
  const [ziMode, setZiMode] = useState<ZiMode>('next-day');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input: BirthInput = {
      name: name.trim() || undefined,
      gender,
      calendar,
      isLeapMonth: calendar === 'lunar' && leap,
      year: toInt(year),
      month: toInt(month),
      day: toInt(day),
      hour: hourUnknown ? null : toInt(hour),
      minute: hourUnknown ? null : toInt(minute),
      birthplace: place.trim() || undefined,
      ziMode,
    };
    const err = validateBirth(input);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    onSubmit(input);
  };

  const radio = (checked: boolean) =>
    `flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition ${
      checked
        ? 'border-violet-600 bg-violet-50 font-semibold text-violet-800 dark:bg-violet-950/60 dark:text-violet-200'
        : 'border-stone-300 hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800'
    }`;

  return (
    <form onSubmit={submit} className="card space-y-5" noValidate>
      <h2 className="text-xl font-bold">생년월일 입력</h2>

      <div>
        <label htmlFor="name" className="label">
          이름 <span className="font-normal text-stone-500">(선택)</span>
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          className="field"
          autoComplete="off"
        />
      </div>

      <fieldset>
        <legend className="label">성별</legend>
        <div className="flex gap-2">
          {(
            [
              ['female', '여성'],
              ['male', '남성'],
            ] as const
          ).map(([v, l]) => (
            <label key={v} className={radio(gender === v)}>
              <input
                type="radio"
                name="gender"
                className="sr-only"
                checked={gender === v}
                onChange={() => setGender(v)}
              />
              {l}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">달력</legend>
        <div className="flex gap-2">
          {(
            [
              ['solar', '양력'],
              ['lunar', '음력'],
            ] as const
          ).map(([v, l]) => (
            <label key={v} className={radio(calendar === v)}>
              <input
                type="radio"
                name="calendar"
                className="sr-only"
                checked={calendar === v}
                onChange={() => setCalendar(v)}
              />
              {l}
            </label>
          ))}
        </div>
        {calendar === 'lunar' && (
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={leap}
              onChange={(e) => setLeap(e.target.checked)}
              className="size-4 accent-violet-600"
            />
            윤달입니다
          </label>
        )}
      </fieldset>

      <fieldset>
        <legend className="label">생년월일</legend>
        <div className="grid grid-cols-3 gap-2">
          <input
            aria-label="년"
            inputMode="numeric"
            placeholder="년 (1990)"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="field"
          />
          <input
            aria-label="월"
            inputMode="numeric"
            placeholder="월"
            value={month}
            onChange={(e) => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
            className="field"
          />
          <input
            aria-label="일"
            inputMode="numeric"
            placeholder="일"
            value={day}
            onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
            className="field"
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">태어난 시간</legend>
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="시"
            value={hour}
            disabled={hourUnknown}
            onChange={(e) => setHour(e.target.value)}
            className="field disabled:opacity-50"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {h}시
              </option>
            ))}
          </select>
          <select
            aria-label="분"
            value={minute}
            disabled={hourUnknown}
            onChange={(e) => setMinute(e.target.value)}
            className="field disabled:opacity-50"
          >
            {Array.from({ length: 60 }, (_, m) => (
              <option key={m} value={m}>
                {m}분
              </option>
            ))}
          </select>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hourUnknown}
            onChange={(e) => setHourUnknown(e.target.checked)}
            className="size-4 accent-violet-600"
          />
          태어난 시간을 모릅니다 (삼주로만 풀이)
        </label>
        {!hourUnknown && hour === '23' && (
          <div className="mt-3 rounded-lg bg-stone-100 p-3 text-sm dark:bg-stone-800">
            <p className="mb-2 font-medium">23시대(자시) 처리 방식</p>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="zi"
                checked={ziMode === 'next-day'}
                onChange={() => setZiMode('next-day')}
                className="mt-1 accent-violet-600"
              />
              <span>23:00부터 다음 날로 계산 (정자시, 기본)</span>
            </label>
            <label className="mt-1 flex items-start gap-2">
              <input
                type="radio"
                name="zi"
                checked={ziMode === 'same-day'}
                onChange={() => setZiMode('same-day')}
                className="mt-1 accent-violet-600"
              />
              <span>당일로 유지, 자정부터 다음 날 (야자시)</span>
            </label>
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor="place" className="label">
          출생지 <span className="font-normal text-stone-500">(선택)</span>
        </label>
        <input
          id="place"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          maxLength={30}
          className="field"
          placeholder="예: 서울"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
        >
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full py-3 text-base">
        사주 보기
      </button>
    </form>
  );
}
