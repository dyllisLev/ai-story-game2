import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://cjpbsgdjpodrfdyqhaja.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqcGJzZ2RqcG9kcmZkeXFoYWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzM3NTcsImV4cCI6MjA4OTM0OTc1N30.cuOaqpl6qZk2iXeCZeyyBmGkzPCn1EfUY_njTaFS1Oo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

export { supabase, currentUser };
