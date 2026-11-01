import {
  BACKOFF_BASE_MS,
  GEMINI_API_BASE,
  KEY_CHECK_TIMEOUT_MS,
  MAX_OUTPUT_TOKENS,
  MAX_RETRIES,
  REQUEST_TIMEOUT_MS,
} from '../constants';
import type { Reading, ScoredSection } from '../types/reading';
import { RESPONSE_SCHEMA, SYSTEM_PROMPT } from './prompt';

export type GeminiErrorKind =
  | 'auth'
  | 'quota'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'blocked'
  | 'parse'
  | 'server'
  | 'bad-request'
  | 'unknown';

const KIND_MESSAGES: Record<GeminiErrorKind, string> = {
  auth: 'API 키가 올바르지 않거나 권한이 없습니다. 키를 다시 확인해 주세요.',
  quota:
    '요청 한도(할당량)를 초과했습니다. 잠시 후 다시 시도하거나 Google AI Studio에서 사용량을 확인해 주세요.',
  network: '네트워크에 연결할 수 없습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
  timeout: '응답 시간이 초과되었습니다. 다시 시도하거나 더 빠른 모델을 선택해 주세요.',
  aborted: '요청이 취소되었습니다.',
  blocked: 'Gemini 안전 정책에 의해 응답이 차단되었습니다. 입력을 바꿔 다시 시도해 주세요.',
  parse: 'AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.',
  server: 'Gemini 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  'bad-request':
    '요청이 거부되었습니다. 선택한 모델을 사용할 수 없는 경우일 수 있으니 설정에서 모델을 바꿔 보세요.',
  unknown: '알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.',
};

export class GeminiError extends Error {
  readonly kind: GeminiErrorKind;
  readonly status?: number;

  constructor(kind: GeminiErrorKind, status?: number) {
    super(KIND_MESSAGES[kind]);
    this.name = 'GeminiError';
    this.kind = kind;
    this.status = status;
  }
}

export interface GeminiOptions {
  apiKey: string;
  model: string;
  signal?: AbortSignal;
  /** 테스트용 주입 지점 */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  backoffBaseMs?: number;
}

/** 사용자에게 보이는 메시지에는 서버가 내려준 원문을 쓰지 않는다(키 노출 방지). 분류된 고정 문구만 사용. */
function classifyStatus(status: number, body: unknown): GeminiErrorKind {
  const errStatus = readString(readObject(readObject(body)?.error)?.status);
  if (status === 429 || errStatus === 'RESOURCE_EXHAUSTED') return 'quota';
  if (status === 401 || status === 403) return 'auth';
  if (status === 400) {
    const message = readString(readObject(readObject(body)?.error)?.message) ?? '';
    return /api key|API_KEY/i.test(message) ? 'auth' : 'bad-request';
  }
  if (status === 404) return 'bad-request';
  if (status >= 500) return 'server';
  return 'unknown';
}

function readObject(v: unknown): Record<string, unknown> | undefined {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}
function readString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

/** 타임아웃 + 사용자 취소를 하나의 signal로 합쳐 fetch한다. */
async function request(
  url: string,
  init: RequestInit,
  opts: GeminiOptions,
  defaultTimeout: number,
): Promise<Response> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs ?? defaultTimeout);
  const onAbort = () => controller.abort();
  if (opts.signal?.aborted) controller.abort();
  opts.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    return await fetchImpl(url, {
      ...init,
      signal: controller.signal,
      headers: { ...init.headers, 'x-goog-api-key': opts.apiKey },
    });
  } catch {
    if (timedOut) throw new GeminiError('timeout');
    if (opts.signal?.aborted) throw new GeminiError('aborted');
    throw new GeminiError('network');
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new GeminiError('aborted'));
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new GeminiError('aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** 가벼운 모델 목록 조회로 API 키 유효성을 확인한다. 실패 시 GeminiError. */
export async function validateApiKey(opts: GeminiOptions): Promise<void> {
  const res = await request(
    `${GEMINI_API_BASE}/models?pageSize=1`,
    { method: 'GET' },
    opts,
    KEY_CHECK_TIMEOUT_MS,
  );
  if (res.ok) return;
  throw new GeminiError(classifyStatus(res.status, await safeJson(res)), res.status);
}

interface GenerateParams {
  systemPrompt?: string;
  userPrompt: string;
}

/** generateContent 1회 호출 + 429/5xx 지수 백오프 재시도(최대 MAX_RETRIES회). 응답 본문 텍스트를 반환. */
async function generateText(opts: GeminiOptions, params: GenerateParams): Promise<string> {
  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(opts.model)}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: params.systemPrompt ?? SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.8,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });
  const base = opts.backoffBaseMs ?? BACKOFF_BASE_MS;

  for (let attempt = 0; ; attempt++) {
    const res = await request(
      url,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
      opts,
      REQUEST_TIMEOUT_MS,
    );
    if (res.ok) return extractText(await safeJson(res));

    const kind = classifyStatus(res.status, await safeJson(res));
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < MAX_RETRIES) {
      await sleep(base * 2 ** attempt, opts.signal);
      continue;
    }
    throw new GeminiError(kind, res.status);
  }
}

/** generateContent 응답에서 JSON 텍스트를 꺼낸다. (사고 과정 parts는 제외) */
export function extractText(data: unknown): string {
  const root = readObject(data);
  if (readString(readObject(root?.promptFeedback)?.blockReason)) throw new GeminiError('blocked');
  const candidates = root?.candidates;
  const first = Array.isArray(candidates) ? readObject(candidates[0]) : undefined;
  const finish = readString(first?.finishReason);
  if (finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT' || finish === 'BLOCKLIST')
    throw new GeminiError('blocked');
  const parts = readObject(first?.content)?.parts;
  if (!Array.isArray(parts)) throw new GeminiError('parse');
  const text = parts
    .map((p) => readObject(p))
    .filter((p) => p && p.thought !== true)
    .map((p) => readString(p?.text) ?? '')
    .join('');
  if (!text.trim()) throw new GeminiError('parse');
  return text;
}

const clampScore = (n: unknown): number => {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new GeminiError('parse');
  return Math.min(100, Math.max(0, Math.round(n)));
};
const text = (v: unknown): string => {
  if (typeof v !== 'string') throw new GeminiError('parse');
  return v;
};
const obj = (v: unknown): Record<string, unknown> => {
  const o = readObject(v);
  if (!o) throw new GeminiError('parse');
  return o;
};
const arr = (v: unknown): unknown[] => {
  if (!Array.isArray(v)) throw new GeminiError('parse');
  return v;
};
const section = (v: unknown): ScoredSection => {
  const o = obj(v);
  return { score: clampScore(o.score), detail: text(o.detail) };
};

/** 모델이 돌려준 JSON 문자열을 검증하고 Reading으로 변환한다. 실패 시 GeminiError('parse'). */
export function parseReading(raw: string): Reading {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new GeminiError('parse');
  }
  const r = obj(json);
  const personality = obj(r.personality);
  const currentYear = obj(r.currentYear);
  const lucky = obj(r.luckyItems);
  return {
    summary: text(r.summary),
    personality: { ...section(personality), title: text(personality.title) },
    overall: section(r.overall),
    wealth: section(r.wealth),
    love: section(r.love),
    business: section(r.business),
    career: section(r.career),
    health: section(r.health),
    relationships: section(r.relationships),
    currentYear: { ...section(currentYear), year: Math.round(Number(currentYear.year)) },
    monthly: arr(r.monthly).map((m) => {
      const o = obj(m);
      return { month: Math.round(Number(o.month)), score: clampScore(o.score), note: text(o.note) };
    }),
    daeun: arr(r.daeun).map((d) => {
      const o = obj(d);
      return { ageRange: text(o.ageRange), theme: text(o.theme), detail: text(o.detail) };
    }),
    luckyItems: {
      color: text(lucky.color),
      direction: text(lucky.direction),
      number: text(lucky.number),
      element: text(lucky.element),
    },
    advice: text(r.advice),
  };
}

/**
 * 풀이 요청. JSON 파싱/검증에 실패하면 1회만 다시 요청한다.
 * (네트워크·할당량 등 다른 오류는 generateText 내부 재시도 정책을 따른다)
 */
export async function requestReading(opts: GeminiOptions, userPrompt: string): Promise<Reading> {
  try {
    return parseReading(await generateText(opts, { userPrompt }));
  } catch (e) {
    if (e instanceof GeminiError && e.kind === 'parse') {
      return parseReading(await generateText(opts, { userPrompt }));
    }
    throw e;
  }
}

/** 어떤 예외든 사용자에게 보여줄 GeminiError로 정규화한다. 키는 포함되지 않는다. */
export function toGeminiError(e: unknown): GeminiError {
  return e instanceof GeminiError ? e : new GeminiError('unknown');
}
