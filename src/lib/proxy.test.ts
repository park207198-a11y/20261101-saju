import { describe, expect, it, vi } from 'vitest';
import { requestReading } from './gemini';
import type { Reading } from '../types/reading';

const sec = { score: 70, detail: 'd' };
const sample: Reading = {
  summary: '요약',
  personality: { ...sec, title: 't' },
  overall: sec,
  wealth: sec,
  love: sec,
  business: sec,
  career: sec,
  health: sec,
  relationships: sec,
  currentYear: { ...sec, year: 2026 },
  monthly: [{ month: 1, score: 60, note: 'n' }],
  daeun: [{ ageRange: '8~17세', theme: 't', detail: 'd' }],
  luckyItems: { color: 'c', direction: 'd', number: 'n', element: 'e' },
  advice: 'a',
};

/** JSON 텍스트를 임의 위치에서 쪼개 SSE 이벤트로 만든다. (조각 경계가 이벤트·글자 중간에 걸리는 경우 포함) */
function sse(text: string, chunkSize = 37): Response {
  const events: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    const part = text.slice(i, i + chunkSize);
    events.push(
      `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: part }] } }] })}\r\n\r\n`,
    );
  }
  events.push(`data: ${JSON.stringify({ candidates: [{ finishReason: 'STOP' }] })}\n\n`);
  const bytes = new TextEncoder().encode(events.join(''));
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < bytes.length; i += 50) c.enqueue(bytes.slice(i, i + 50));
      c.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const base = { model: 'gemini-3-flash-preview', backoffBaseMs: 1 };

describe('서버 공용 키(프록시) 모드', () => {
  it('키가 없으면 /api/reading으로 model·userPrompt만 보내고 SSE를 이어 붙여 파싱한다', async () => {
    const fetchImpl = vi.fn(async () => sse(JSON.stringify(sample)));
    const r = await requestReading({ ...base, fetchImpl }, '프롬프트');
    expect(r.summary).toBe('요약');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/reading');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'gemini-3-flash-preview',
      userPrompt: '프롬프트',
    });
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBeUndefined();
  });

  it('프록시가 없는 환경(404, HTML 200)은 proxy-unavailable이며 재시도하지 않는다', async () => {
    const notFound = vi.fn(async () => new Response('nf', { status: 404 }));
    await expect(requestReading({ ...base, fetchImpl: notFound }, 'p')).rejects.toMatchObject({
      kind: 'proxy-unavailable',
    });
    expect(notFound).toHaveBeenCalledTimes(1);

    const html = vi.fn(
      async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }),
    );
    await expect(requestReading({ ...base, fetchImpl: html }, 'p')).rejects.toMatchObject({
      kind: 'proxy-unavailable',
    });
  });

  it('서버에 키가 없으면(503 no-server-key) proxy-unavailable, 재시도 없음', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ code: 'no-server-key' }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        }),
    );
    await expect(requestReading({ ...base, fetchImpl }, 'p')).rejects.toMatchObject({
      kind: 'proxy-unavailable',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('429는 quota로 재시도 후 실패한다', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ code: 'upstream-error' }), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        }),
    );
    await expect(requestReading({ ...base, fetchImpl }, 'p')).rejects.toMatchObject({
      kind: 'quota',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('스트림이 중간에 잘려 JSON이 깨지면 1회 다시 요청한다', async () => {
    const full = JSON.stringify(sample);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(sse(full.slice(0, 100)))
      .mockResolvedValueOnce(sse(full));
    await expect(requestReading({ ...base, fetchImpl }, 'p')).resolves.toBeTruthy();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
