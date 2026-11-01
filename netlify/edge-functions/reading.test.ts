import { describe, expect, it, vi } from 'vitest';
import { handleReading } from './reading';

const SERVER_KEY = 'server-secret-key-for-test';

function req(
  body: unknown,
  { origin = 'https://hahasaju.netlify.app', method = 'POST' } = {},
): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (origin) headers.origin = origin;
  return new Request('https://hahasaju.netlify.app/api/reading', {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

const ok = { model: 'gemini-3-flash-preview', userPrompt: '사주 데이터' };

describe('Edge Function 프록시 handleReading', () => {
  it('유효한 요청은 서버 키를 헤더로 붙여 streamGenerateContent로 전달하고 스트림을 돌려준다', async () => {
    const fetchImpl = vi.fn(async () => new Response('data: {}\n\n', { status: 200 }));
    const res = await handleReading(req(ok), SERVER_KEY, fetchImpl);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/models/gemini-3-flash-preview:streamGenerateContent?alt=sse');
    expect(url).not.toContain(SERVER_KEY);
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(SERVER_KEY);
    const sent = JSON.parse(init.body as string);
    expect(sent.generationConfig.responseSchema.type).toBe('OBJECT');
    expect(sent.contents[0].parts[0].text).toBe('사주 데이터');
    expect(sent.systemInstruction.parts[0].text).toContain('사주 상담가');
  });

  it('서버 키가 없으면 503 no-server-key', async () => {
    const res = await handleReading(req(ok), undefined, vi.fn());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ code: 'no-server-key' });
  });

  it('다른 사이트(Origin)·Origin 없음·GET은 거절한다', async () => {
    const fetchImpl = vi.fn();
    expect(
      (await handleReading(req(ok, { origin: 'https://evil.example' }), SERVER_KEY, fetchImpl))
        .status,
    ).toBe(403);
    expect((await handleReading(req(ok, { origin: '' }), SERVER_KEY, fetchImpl)).status).toBe(403);
    expect((await handleReading(req(ok, { method: 'GET' }), SERVER_KEY, fetchImpl)).status).toBe(
      405,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('허용되지 않은 모델, 빈/과대 프롬프트는 400', async () => {
    const fetchImpl = vi.fn();
    const bad = [
      { ...ok, model: 'gemini-ultra-secret' },
      { ...ok, userPrompt: '' },
      { ...ok, userPrompt: 'x'.repeat(20_001) },
      { model: 5, userPrompt: 'x' },
    ];
    for (const b of bad) {
      expect((await handleReading(req(b), SERVER_KEY, fetchImpl)).status).toBe(400);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('업스트림 429/5xx는 상태를 유지하고, 그 외 오류는 502로 바꾸며 원문·키를 노출하지 않는다', async () => {
    const mk = (status: number) =>
      vi.fn(async () => new Response(`secret ${SERVER_KEY} details`, { status }));
    expect((await handleReading(req(ok), SERVER_KEY, mk(429))).status).toBe(429);
    expect((await handleReading(req(ok), SERVER_KEY, mk(503))).status).toBe(503);
    const res = await handleReading(req(ok), SERVER_KEY, mk(403));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain(SERVER_KEY);
  });
});
