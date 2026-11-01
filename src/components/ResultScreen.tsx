import { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { readingToText } from '../lib/readingText';
import type { Reading } from '../types/reading';
import type { SajuResult } from '../types/saju';
import ReadingSkeleton from './ReadingSkeleton';
import { FullReading, TABS, TabContent, type TabId } from './ReadingSections';
import SajuChart from './SajuChart';

export type ReadingState =
  | { status: 'loading' }
  | { status: 'done'; reading: Reading }
  | { status: 'error'; message: string; cancelled: boolean };

interface Props {
  saju: SajuResult;
  state: ReadingState;
  fromHistory: boolean;
  onRetry: () => void;
  onCancel: () => void;
  onRestart: () => void;
}

export default function ResultScreen({
  saju,
  state,
  fromHistory,
  onRetry,
  onCancel,
  onRestart,
}: Props) {
  const [tab, setTab] = useState<TabId>('summary');
  const [capturing, setCapturing] = useState(false);
  const [notice, setNotice] = useState('');
  const captureRef = useRef<HTMLDivElement>(null);
  const reading = state.status === 'done' ? state.reading : null;

  useEffect(() => {
    if (!capturing || !captureRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const dark = document.documentElement.classList.contains('dark');
        const url = await toPng(captureRef.current!, {
          pixelRatio: 2,
          backgroundColor: dark ? '#0c0a09' : '#fafaf9',
        });
        if (cancelled) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = `saju-${saju.solar.year}${String(saju.solar.month).padStart(2, '0')}${String(saju.solar.day).padStart(2, '0')}.png`;
        a.click();
        setNotice('이미지를 저장했습니다.');
      } catch {
        setNotice('이미지 저장에 실패했습니다. 텍스트 복사를 이용해 주세요.');
      } finally {
        if (!cancelled) setCapturing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [capturing, saju]);

  const copy = async () => {
    if (!reading) return;
    try {
      await navigator.clipboard.writeText(readingToText(saju, reading));
      setNotice('풀이 내용을 복사했습니다.');
    } catch {
      setNotice('복사에 실패했습니다. 브라우저의 클립보드 권한을 확인해 주세요.');
    }
  };

  return (
    <div className="space-y-5">
      <SajuChart saju={saju} />

      {state.status === 'loading' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">AI가 사주를 풀이하고 있습니다… (최대 1분)</p>
            <button type="button" onClick={onCancel} className="btn-secondary">
              취소
            </button>
          </div>
          <ReadingSkeleton />
        </div>
      )}

      {state.status === 'error' && (
        <div className="card space-y-3">
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {state.message}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onRetry} className="btn-primary">
              다시 시도
            </button>
          </div>
        </div>
      )}

      {reading && (
        <div className="card space-y-4">
          <div
            role="tablist"
            aria-label="풀이 항목"
            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${
                  tab === t.id
                    ? 'bg-violet-600 font-semibold text-white'
                    : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel">
            <TabContent tab={tab} reading={reading} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {reading && (
          <>
            <button type="button" onClick={copy} className="btn-secondary">
              텍스트 복사
            </button>
            <button
              type="button"
              onClick={() => setCapturing(true)}
              disabled={capturing}
              className="btn-secondary"
            >
              {capturing ? '저장 중…' : '이미지로 저장'}
            </button>
            {!fromHistory && (
              <button type="button" onClick={onRetry} className="btn-secondary">
                다시 풀이
              </button>
            )}
          </>
        )}
        <button type="button" onClick={onRestart} className="btn-primary ml-auto">
          다른 사람 사주 보기
        </button>
      </div>
      {notice && (
        <p role="status" className="text-sm text-stone-600 dark:text-stone-400">
          {notice}
        </p>
      )}

      {capturing && reading && (
        <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0 }}>
          <div
            ref={captureRef}
            className="w-[720px] space-y-6 bg-stone-50 p-6 text-stone-900 dark:bg-stone-950 dark:text-stone-100"
          >
            <SajuChart saju={saju} />
            <FullReading reading={reading} />
            <p className="text-center text-xs text-stone-500">
              본 풀이는 재미와 참고용이며 의학·재무·법률적 조언이 아닙니다
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
