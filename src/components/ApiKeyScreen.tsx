import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AI_STUDIO_KEY_URL, GEMINI_MODELS } from '../constants';
import { toGeminiError, validateApiKey } from '../lib/gemini';

interface Props {
  initialKey: string;
  initialPersistent: boolean;
  model: string;
  onModelChange: (model: string) => void;
  /** 본인 키로 풀이 */
  onConfirm: (key: string, persistent: boolean) => void;
  /** 서버 공용 키로 풀이 (저장된 본인 키는 삭제) */
  onUseServer: () => void;
  onBack: () => void;
}

export default function ApiKeyScreen({
  initialKey,
  initialPersistent,
  model,
  onModelChange,
  onConfirm,
  onUseServer,
  onBack,
}: Props) {
  const [key, setKey] = useState(initialKey);
  const [show, setShow] = useState(false);
  const [persistent, setPersistent] = useState(initialPersistent);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError(
        '본인 키를 쓰려면 API 키를 입력해 주세요. 키 없이 쓰려면 "서버 키로 사용"을 누르세요.',
      );
      return;
    }
    setError('');
    setChecking(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await validateApiKey({ apiKey: trimmed, model, signal: ac.signal });
      onConfirm(trimmed, persistent);
    } catch (err) {
      const g = toGeminiError(err);
      if (g.kind !== 'aborted') setError(g.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-5">
      <div>
        <h2 className="text-xl font-bold">풀이 설정</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          기본은 <b>서버 공용 키</b>로 풀이하며 키 입력이 필요 없습니다. 이용자가 많으면 한도에 걸릴
          수 있으니, 그럴 땐 본인의 Gemini API 키를 입력해 쓰세요. 키가 없다면{' '}
          <a
            href={AI_STUDIO_KEY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-violet-600 underline dark:text-violet-400"
          >
            Google AI Studio에서 무료로 발급
          </a>
          받을 수 있습니다.
        </p>
      </div>

      <div>
        <label htmlFor="model" className="label">
          모델
        </label>
        <select
          id="model"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className="field"
        >
          {GEMINI_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="apikey" className="label">
          내 API 키 <span className="font-normal text-stone-500">(선택)</span>
        </label>
        <div className="flex gap-2">
          <input
            id="apikey"
            type={show ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="AIza..."
            className="field"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="btn-secondary shrink-0"
            aria-pressed={show}
          >
            {show ? '숨김' : '표시'}
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={persistent}
            onChange={(e) => setPersistent(e.target.checked)}
            className="size-4 accent-violet-600"
          />
          이 기기에 키 저장
          <span className="text-xs text-stone-500">(해제 시 이 탭을 닫으면 삭제됩니다)</span>
        </label>
      </div>

      <div className="space-y-2 rounded-lg bg-violet-50 p-3 text-xs leading-relaxed text-violet-900 dark:bg-violet-950/50 dark:text-violet-200">
        <p>
          🔒 <b>본인 키</b>: 키는 브라우저에서 Google 서버로만 전송되며 이 앱의 서버에는 저장되지
          않습니다. 공용 PC에서는 &quot;이 기기에 키 저장&quot;을 켜지 마세요.
        </p>
        <p>
          🌐 <b>서버 키</b>: 입력한 생년월일 정보가 이 사이트의 서버를 거쳐 Google Gemini로
          전달됩니다. 서버는 내용을 저장하거나 기록하지 않습니다.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={checking} className="btn-primary">
          {checking ? '확인 중…' : '내 키 확인 후 사용'}
        </button>
        <button type="button" onClick={onUseServer} className="btn-secondary">
          서버 키로 사용
        </button>
        <button type="button" onClick={onBack} className="btn-secondary">
          돌아가기
        </button>
      </div>
    </form>
  );
}
