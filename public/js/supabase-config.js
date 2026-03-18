import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// SEC-001: 환경변수에서 Supabase 설정 로드 (Cloudflare Pages Function)
// 로컬 개발 시에는 폴백 값 사용
const FALLBACK_URL = 'https://cjpbsgdjpodrfdyqhaja.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqcGJzZ2RqcG9kcmZkeXFoYWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzM3NTcsImV4cCI6MjA4OTM0OTc1N30.cuOaqpl6qZk2iXeCZeyyBmGkzPCn1EfUY_njTaFS1Oo';

let supabaseUrl = FALLBACK_URL;
let supabaseAnonKey = FALLBACK_ANON_KEY;
// promptConfig/gameplayConfig: nullable — admin page does NOT need these.
// Play/editor pages MUST null-check at their entry point.
let promptConfig = null;
let gameplayConfig = null;

try {
  const res = await fetch('/api/config');
  if (res.ok) {
    const config = await res.json();
    supabaseUrl = config.url;
    supabaseAnonKey = config.anonKey;
    promptConfig = config.promptConfig || null;
    gameplayConfig = config.gameplayConfig || null;
  }
} catch (e) {
  // /api/config 없음 (로컬 개발) → 폴백 사용
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 익명 인증
let currentUser = null;
try {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
  } else {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    currentUser = data.user;
  }
} catch (e) {
  console.warn('Supabase auth failed:', e);
}

export { supabase, currentUser, promptConfig, gameplayConfig };
