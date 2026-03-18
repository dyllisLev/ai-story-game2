/**
 * AI Story Game - Cloudflare Worker
 *
 * 환경변수 (Cloudflare Dashboard > Workers > ai-story-game > 설정 > 변수 및 암호):
 *   SUPABASE_URL      - Supabase 프로젝트 URL
 *   SUPABASE_ANON_KEY  - Supabase anon key (암호화 권장)
 *   ADMIN_USER         - 관리자 페이지 아이디
 *   ADMIN_PASS         - 관리자 페이지 비밀번호 (암호화 필수)
 *   SUPABASE_SERVICE_KEY - Supabase service_role key (관리자 설정 저장용, 암호화 필수)
 */

// --- Constant-time 문자열 비교 (타이밍 공격 방지) ---
function safeCompare(a, b) {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  const maxLen = Math.max(bufA.length, bufB.length);
  let mismatch = bufA.length !== bufB.length ? 1 : 0;
  for (let i = 0; i < maxLen; i++) {
    mismatch |= (bufA[i] || 0) ^ (bufB[i] || 0);
  }
  return mismatch === 0;
}

// --- /api/config: Supabase 설정 제공 ---
async function handleApiConfig(env) {
  const url = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let promptConfig = null;
  let gameplayConfig = null;

  try {
    const configRes = await fetch(
      `${url}/rest/v1/config?id=in.(prompt_config,gameplay_config)&select=id,value`,
      {
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
      }
    );

    if (!configRes.ok) {
      throw new Error(`Supabase API error: ${configRes.status}`);
    }

    const rows = await configRes.json();
    for (const row of rows) {
      if (row.id === 'prompt_config') promptConfig = row.value;
      else if (row.id === 'gameplay_config') gameplayConfig = row.value;
    }

    if (!promptConfig || !gameplayConfig) {
      const missing = [];
      if (!promptConfig) missing.push('prompt_config');
      if (!gameplayConfig) missing.push('gameplay_config');
      throw new Error(`Missing config: ${missing.join(', ')}`);
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ url, anonKey, promptConfig, gameplayConfig }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

// --- PUT /api/config: 관리자 설정 업데이트 ---
async function handleApiConfigUpdate(request, env) {
  const authResult = handleAdminAuth(request, env);
  if (authResult) return authResult;

  const serviceKey = env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) {
    return new Response(JSON.stringify({ error: 'Service key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { promptConfig, gameplayConfig } = body;
  if (!promptConfig || !gameplayConfig) {
    return new Response(JSON.stringify({ error: 'Missing promptConfig or gameplayConfig' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = env.SUPABASE_URL;

  try {
    const res1 = await fetch(
      `${supabaseUrl}/rest/v1/config?id=eq.prompt_config`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ value: promptConfig }),
      }
    );
    if (!res1.ok) throw new Error(`prompt_config update failed: ${res1.status}`);

    const res2 = await fetch(
      `${supabaseUrl}/rest/v1/config?id=eq.gameplay_config`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ value: gameplayConfig }),
      }
    );
    if (!res2.ok) throw new Error(`gameplay_config update failed: ${res2.status}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// --- /base_story_admin*: Basic Auth 보호 ---
function handleAdminAuth(request, env) {
  const ADMIN_USER = env.ADMIN_USER;
  const ADMIN_PASS = env.ADMIN_PASS;

  if (!ADMIN_USER || !ADMIN_PASS) {
    return new Response('Admin access not configured', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Area"',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  let user, pass;
  try {
    const decoded = atob(authHeader.slice(6));
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) throw new Error('Invalid format');
    user = decoded.slice(0, colonIndex);
    pass = decoded.slice(colonIndex + 1);
  } catch {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Area"',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  const userMatch = safeCompare(user, ADMIN_USER);
  const passMatch = safeCompare(pass, ADMIN_PASS);

  if (!userMatch || !passMatch) {
    return new Response('Forbidden', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 인증 성공 → null 반환하여 정적 자산으로 진행
  return null;
}

// --- Worker entry point ---
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // PUT /api/config → 관리자 설정 업데이트
    if (url.pathname === '/api/config' && request.method === 'PUT') {
      return handleApiConfigUpdate(request, env);
    }

    // GET /api/config → Supabase 설정 반환
    if (url.pathname === '/api/config') {
      return handleApiConfig(env);
    }

    // /base_story_admin* → Basic Auth 체크
    if (url.pathname.startsWith('/base_story_admin')) {
      const authResponse = handleAdminAuth(request, env);
      if (authResponse) return authResponse;
      // 인증 성공 → 정적 자산으로 fall through
    }

    // 그 외 모든 요청 → 정적 자산 서빙
    return env.ASSETS.fetch(request);
  },
};
