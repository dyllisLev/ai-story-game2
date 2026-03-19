const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id) {
  return typeof id === 'string' && UUID_RE.test(id);
}

function headers(env) {
  return {
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Content-Type': 'application/json',
  };
}

function url(env, path) {
  return `${env.SUPABASE_URL}/rest/v1/${path}`;
}

export async function getSession(env, sessionId) {
  const res = await fetch(url(env, `sessions?id=eq.${sessionId}&select=*`), { headers: headers(env) });
  if (!res.ok) throw new Error(`Session query failed: ${res.status}`);
  const rows = await res.json();
  if (!rows.length) return null;
  return rows[0];
}

export async function getStory(env, storyId) {
  const res = await fetch(url(env, `stories?id=eq.${storyId}&select=*`), { headers: headers(env) });
  if (!res.ok) throw new Error(`Story query failed: ${res.status}`);
  const rows = await res.json();
  return rows[0] || null;
}

export async function getConfig(env) {
  const res = await fetch(
    url(env, `config?id=in.(prompt_config,gameplay_config)&select=id,value`),
    { headers: headers(env) }
  );
  if (!res.ok) throw new Error(`Config query failed: ${res.status}`);
  const rows = await res.json();
  const result = {};
  for (const row of rows) {
    if (row.id === 'prompt_config') result.promptConfig = row.value;
    else if (row.id === 'gameplay_config') result.gameplayConfig = row.value;
  }
  return result;
}

export async function getSessionMemory(env, sessionId) {
  const res = await fetch(
    url(env, `session_memory?session_id=eq.${sessionId}&select=type,content`),
    { headers: headers(env) }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows.length) return null;
  const memory = { shortTerm: [], longTerm: [], characters: [], goals: '' };
  for (const row of rows) {
    if (row.type === 'short_term') memory.shortTerm = row.content;
    else if (row.type === 'long_term') memory.longTerm = row.content;
    else if (row.type === 'characters') memory.characters = row.content;
    else if (row.type === 'goals') memory.goals = typeof row.content === 'string' ? row.content : JSON.stringify(row.content);
  }
  return memory;
}

export async function createSession(env, data) {
  const res = await fetch(url(env, 'sessions'), {
    method: 'POST',
    headers: { ...headers(env), 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Session create failed: ${res.status}`);
  const rows = await res.json();
  return rows[0];
}

export async function updateSession(env, sessionId, data) {
  const res = await fetch(url(env, `sessions?id=eq.${sessionId}`), {
    method: 'PATCH',
    headers: { ...headers(env), 'Prefer': 'return=minimal' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Session update failed: ${res.status}`);
}

export async function deleteSession(env, sessionId) {
  const res = await fetch(url(env, `sessions?id=eq.${sessionId}`), {
    method: 'DELETE',
    headers: headers(env),
  });
  if (!res.ok) throw new Error(`Session delete failed: ${res.status}`);
}

export async function upsertMemory(env, sessionId, type, content) {
  const res = await fetch(url(env, 'session_memory'), {
    method: 'POST',
    headers: { ...headers(env), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ session_id: sessionId, type, content }),
  });
  if (!res.ok) throw new Error(`Memory upsert failed: ${res.status}`);
}

export async function insertApiLog(env, logData) {
  await fetch(url(env, 'api_logs'), {
    method: 'POST',
    headers: { ...headers(env), 'Prefer': 'return=minimal' },
    body: JSON.stringify(logData),
  });
}
