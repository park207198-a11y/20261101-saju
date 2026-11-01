import type { Element } from './types/saju';

export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface ModelOption {
  id: string;
  label: string;
}

export const GEMINI_MODELS: readonly ModelOption[] = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (빠름, 기본)' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (정밀, 느림)' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (가장 빠름)' },
];
export const DEFAULT_MODEL = 'gemini-2.5-flash';

/** 한 번의 풀이 요청 제한 시간 */
export const REQUEST_TIMEOUT_MS = 60_000;
/** 키 확인용 가벼운 호출 제한 시간 */
export const KEY_CHECK_TIMEOUT_MS = 15_000;
/** 429/5xx 재시도 횟수와 최초 대기 시간(지수 백오프: 1s, 2s) */
export const MAX_RETRIES = 2;
export const BACKOFF_BASE_MS = 1000;
export const MAX_OUTPUT_TOKENS = 32768;

export const AI_STUDIO_KEY_URL = 'https://aistudio.google.com/app/apikey';

/** 오행별 색상 (흰 글자 대비 4.5:1 이상 확보) */
export const ELEMENT_COLORS: Record<Element, string> = {
  목: '#15803d',
  화: '#dc2626',
  토: '#a16207',
  금: '#64748b',
  수: '#2563eb',
};

export const ELEMENT_HANJA: Record<Element, string> = {
  목: '木',
  화: '火',
  토: '土',
  금: '金',
  수: '水',
};

export const DISCLAIMER = '본 풀이는 재미와 참고용이며 의학·재무·법률적 조언이 아닙니다';

export const MIN_BIRTH_YEAR = 1900;

export const STORAGE_KEYS = {
  apiKey: 'saju.apiKey',
  model: 'saju.model',
  theme: 'saju.theme',
  history: 'saju.history',
} as const;

export const MAX_HISTORY = 20;
