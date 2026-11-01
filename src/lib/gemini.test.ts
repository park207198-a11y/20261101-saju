import { describe, expect, it, vi } from 'vitest';
import { GeminiError, parseReading, requestReading, validateApiKey } from './gemini';
import type { Reading } from '../types/reading';

const KEY = 'AIzaSyFAKE-KEY-FOR-TEST-0123456789';

const sample: Reading = {
  summary: '요약',
  personality: { score: 70, title: '제목', detail: '내용' },
  overall: { score: 71, detail: 'd' },
  wealth: { score: 72, detail: 'd' },
  love: { score: 73, detail: 'd' },
  business: { score: 74, detail: 'd' },
  career: { score: 75, detail: 'd' },
  health: { score: 76, detail: 'd' },
  relationships: { score: 77, detail: 'd' },
  currentYear: { year: 2026, score: 78, detail: 'd' },
  monthly: [{ month: 1, score: 60, note: 'n' }],
  daeun: [{ ageRange: '8~17세', theme: 't', detail: 'd' }],
  luckyItems: { color: '파랑', direction: '북', number: '1, 6', element: '수' },
  advice: 'a',
};

const okResponse = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
  });
const errResponse = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status });

const base = { apiKey: KEY, model: 'gemini-2.5-flash', backoffBaseMs: 1 };

describe('gemini.requestReading', () => {
  it('키는 헤더로만 전달하고 URL에는 넣지 않는다', async () => {
    const fetchImpl = vi.fn(async () => okResponse(JSON.stringify(sample)));
    const r = await requestReading({ ...base, fetchImpl }, 'prompt');
    expect(r.summary).toBe('요약');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain(KEY);
    expect(url).toContain('/models/gemini-2.5-flash:generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY);
    const body = JSON.parse(init.body as string);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema.type).toBe('OBJECT');
  });

  it('429/5xx는 최대 2회까지 재시도 후 성공한다', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(errResponse(429))
      .mockResolvedValueOnce(errResponse(503))
      .mockResolvedValueOnce(okResponse(JSON.stringify(sample)));
    await expect(requestReading({ ...base, fetchImpl }, 'p')).resolves.toBeTruthy();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('429가 계속되면 총 3회 호출 후 quota 오류', async () => {
    const fetchImpl = vi.fn(async () => errResponse(429));
    await expect(requestReading({ ...base, fetchImpl }, 'p')).rejects.toMatchObject({
      kind: 'quota',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('JSON 파싱 실패 시 1회만 다시 요청한다', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(okResponse('{ 깨진 json'))
      .mockResolvedValueOnce(okResponse(JSON.stringify(sample)));
    await expect(requestReading({ ...base, fetchImpl }, 'p')).resolves.toBeTruthy();
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const bad = vi.fn(async () => okResponse('nope'));
    await expect(requestReading({ ...base, fetchImpl: bad }, 'p')).rejects.toMatchObject({
      kind: 'parse',
    });
    expect(bad).toHaveBeenCalledTimes(2);
  });

  it('401/403/400(키 오류)는 재시도 없이 auth 오류, 메시지에 키가 없다', async () => {
    const fetchImpl = vi.fn(async () =>
      errResponse(400, {
        error: { message: `API key not valid ${KEY}`, status: 'INVALID_ARGUMENT' },
      }),
    );
    const err = await requestReading({ ...base, fetchImpl }, 'p').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GeminiError);
    expect((err as GeminiError).kind).toBe('auth');
    expect((err as GeminiError).message).not.toContain(KEY);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('네트워크 실패는 network 오류, 키가 메시지에 노출되지 않는다', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError(`Failed to fetch ?key=${KEY}`);
    });
    const err = (await requestReading({ ...base, fetchImpl }, 'p').catch(
      (e: unknown) => e,
    )) as GeminiError;
    expect(err.kind).toBe('network');
    expect(err.message).not.toContain(KEY);
  });

  it('사용자 취소는 aborted', async () => {
    const ac = new AbortController();
    const fetchImpl = vi.fn(
      (_u: string, init: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          init.signal?.addEventListener('abort', () => rej(new DOMException('x', 'AbortError')));
        }),
    );
    const p = requestReading(
      { ...base, fetchImpl: fetchImpl as unknown as typeof fetch, signal: ac.signal },
      'p',
    );
    ac.abort();
    await expect(p).rejects.toMatchObject({ kind: 'aborted' });
  });

  it('타임아웃은 timeout', async () => {
    const fetchImpl = vi.fn(
      (_u: string, init: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          init.signal?.addEventListener('abort', () => rej(new DOMException('x', 'AbortError')));
        }),
    );
    await expect(
      requestReading(
        { ...base, fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 20 },
        'p',
      ),
    ).rejects.toMatchObject({ kind: 'timeout' });
  });
});

describe('gemini.validateApiKey', () => {
  it('성공/실패를 분류한다', async () => {
    await expect(
      validateApiKey({
        ...base,
        fetchImpl: vi.fn(async () => new Response('{}', { status: 200 })),
      }),
    ).resolves.toBeUndefined();
    await expect(
      validateApiKey({ ...base, fetchImpl: vi.fn(async () => errResponse(403)) }),
    ).rejects.toMatchObject({ kind: 'auth' });
    await expect(
      validateApiKey({ ...base, fetchImpl: vi.fn(async () => errResponse(429)) }),
    ).rejects.toMatchObject({ kind: 'quota' });
  });
});

describe('gemini.parseReading', () => {
  it('코드펜스를 제거하고 점수를 0~100으로 보정한다', () => {
    const wrapped =
      '```json\n' + JSON.stringify({ ...sample, wealth: { score: 150, detail: 'x' } }) + '\n```';
    expect(parseReading(wrapped).wealth.score).toBe(100);
  });

  it('필수 필드가 없으면 parse 오류', () => {
    expect(() => parseReading(JSON.stringify({ summary: 'x' }))).toThrow(GeminiError);
  });
});
