import type { HistoryEntry } from '../lib/storage';

interface Props {
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export default function HistoryPanel({ entries, onOpen, onDelete, onClear }: Props) {
  if (entries.length === 0) return null;
  return (
    <section className="card mt-5 space-y-3" aria-label="풀이 기록">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">이전 풀이 기록</h2>
        <button
          type="button"
          onClick={onClear}
          className="btn-ghost text-red-700 dark:text-red-300"
        >
          전체 삭제
        </button>
      </div>
      <p className="text-xs text-stone-500">이 기기의 브라우저에만 저장됩니다.</p>
      <ul className="divide-y divide-stone-200 dark:divide-stone-800">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2 py-2">
            <button type="button" onClick={() => onOpen(e)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium">
                {e.saju.input.name || '이름 없음'} · {e.saju.solar.year}.{e.saju.solar.month}.
                {e.saju.solar.day}
              </div>
              <div className="text-xs text-stone-500">
                {e.saju.pillars.year.ganzhi} {e.saju.pillars.month.ganzhi}{' '}
                {e.saju.pillars.day.ganzhi} {e.saju.pillars.hour?.ganzhi ?? ''} ·{' '}
                {new Date(e.createdAt).toLocaleDateString('ko-KR')}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onDelete(e.id)}
              className="btn-ghost shrink-0"
              aria-label="이 기록 삭제"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
