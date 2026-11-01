/**
 * 서버 공용 키 풀이 프록시 (Netlify Edge Function).
 *
 * - GEMINI_API_KEY 환경변수의 키로 Gemini streamGenerateContent를 호출하고 SSE 스트림을 그대로 전달한다.
 *   (스트리밍이라 응답이 바로 시작되어 Edge Function의 응답 시작 제한 시간 안에 들어온다.)
 * - 시스템 프롬프트·응답 스키마·토큰 상한은 서버에서 고정한다. 클라이언트는 model과 userPrompt만 보낸다.
 * - 사용량 제한(rate limit)은 없다. Origin 검사는 다른 사이트의 브라우저 호출을 막는 최소한의 장치일 뿐이다.
 * - 요청 내용(생년월일 등)은 저장하거나 로그로 남기지 않는다.
 */
import { GEMINI_API_BASE, GEMINI_MODELS, MAX_PROMPT_CHARS } from '../../src/constants.ts';
import { buildRequestBody } from '../../src/lib/prompt.ts';

interface NetlifyGlobal {
  env: { get(name: string): string | undefined };
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function handleReading(
  req: Request,
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (req.method !== 'POST') return json(405, { code: 'method-not-allowed' });

  const origin = req.headers.get('origin');
  if (!origin || new URL(origin).host !== new URL(req.url).host) {
    return json(403, { code: 'forbidden-origin' });
  }
  if (!apiKey) return json(503, { code: 'no-server-key' });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json(400, { code: 'bad-json' });
  }
  const { model, userPrompt } = (payload ?? {}) as { model?: unknown; userPrompt?: unknown };
  if (typeof model !== 'string' || !GEMINI_MODELS.some((m) => m.id === model)) {
    return json(400, { code: 'bad-model' });
  }
  if (typeof userPrompt !== 'string' || !userPrompt || userPrompt.length > MAX_PROMPT_CHARS) {
    return json(400, { code: 'bad-prompt' });
  }

  let upstream: Response;
  try {
    upstream = await fetchImpl(
      `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: buildRequestBody(userPrompt),
      },
    );
  } catch {
    return json(502, { code: 'upstream-unreachable' });
  }

  if (!upstream.ok) {
    // 업스트림 오류 원문은 전달하지 않고 상태 코드만 전달한다. (429는 그대로, 그 외 4xx는 서버 설정 문제로 502)
    const status = upstream.status === 429 || upstream.status >= 500 ? upstream.status : 502;
    return json(status, { code: 'upstream-error' });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' },
  });
}

export default (req: Request): Promise<Response> =>
  handleReading(
    req,
    (globalThis as { Netlify?: NetlifyGlobal }).Netlify?.env.get('GEMINI_API_KEY'),
  );

export const config = { path: '/api/reading' };
