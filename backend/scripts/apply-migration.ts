#!/usr/bin/env tsx
// Apply migration 20260331010000 using Supabase client
import { createClient } from '@supabase/supabase-js';
import { loadConfig } from '../src/config.js';
import 'dotenv/config';

const config = loadConfig();
const schema = process.env.SUPABASE_SCHEMA || 'public';
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY,
  {
    db: { schema }
  }
);

async function applyMigration() {
  console.log('Applying migration 20260331010000...');

  // Step 1: Get current gameplay_config
  console.log('Fetching current gameplay_config...');
  const { data: currentGc, error: gcError } = await supabase
    .from('config')
    .select('value')
    .eq('id', 'gameplay_config')
    .single();

  if (gcError) {
    console.error('Failed to fetch gameplay_config:', gcError);
    process.exit(1);
  }

  // Step 2: Extend gameplay_config with new fields
  console.log('Extending gameplay_config...');
  const extendedGc = {
    ...(currentGc.value as any),
    available_models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", context_window: 128000, is_default: true },
      { id: "gemini-2.0-pro", label: "Gemini 2.0 Pro", context_window: 128000 },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", context_window: 128000 }
    ],
    input_modes: [
      { id: "action", label: "행동", emoji: "⚔", prefix: "[행동] " },
      { id: "thought", label: "생각", emoji: "💭", prefix: "[생각] " },
      { id: "dialogue", label: "대사", emoji: "💬", prefix: "[대사] " },
      { id: "scene", label: "장면 지시", emoji: "🎬", prefix: "[장면 지시] " }
    ],
    status_attribute_types: [
      { id: "bar", label: "수치바" },
      { id: "percent", label: "퍼센트" },
      { id: "number", label: "숫자" },
      { id: "text", label: "텍스트" },
      { id: "list", label: "목록" },
      { id: "gauge", label: "게이지" }
    ],
    default_suggestions: [
      "⚔️ 행동으로 맞서다",
      "🤔 신중하게 생각해보다",
      "💬 대화를 시도하다",
      "🌀 상황을 관찰하다"
    ],
    character_relations: ["우호적", "중립", "적대"],
    story_icons: ["🏛️", "⚔️", "🧙", "🏙️", "💀", "🚀", "👻", "💕", "🐉", "🌙", "🔥", "🗡️"],
    character_icons: ["🧙", "⚔️", "🏹", "🛡️", "🗡️", "👁️", "🔥", "🌙"],
    memory_categories: [
      { id: "shortTerm", dbKey: "short_term", label: "단기 기억", icon: "⚡" },
      { id: "longTerm", dbKey: "long_term", label: "장기 기억", icon: "🧠" },
      { id: "characters", dbKey: "characters", label: "등장인물", icon: "👤" },
      { id: "goals", dbKey: "goals", label: "목표", icon: "🎯" }
    ],
    editor_defaults: {
      icon: "📖",
      aiModel: "gemini-2.0-flash",
      narrativeLength: 3,
      useLatex: false,
      useCache: true,
      useStatusWindow: true,
      isPublic: false
    },
    default_labels: {
      new_session: "새 세션",
      untitled_story: "제목 없음"
    }
  };

  const { error: updateError } = await supabase
    .from('config')
    .update({ value: extendedGc })
    .eq('id', 'gameplay_config');

  if (updateError) {
    console.error('Failed to update gameplay_config:', updateError);
    process.exit(1);
  }

  console.log('✓ gameplay_config extended');

  // Step 3: Insert genre_config
  console.log('Inserting genre_config...');
  const genreConfig = {
    genres: [
      { id: "moo", name: "무협", color: "#c49a3c", bgColor: "rgba(196,154,60,0.1)", borderColor: "rgba(196,154,60,0.35)", icon: "⚔️" },
      { id: "fantasy", name: "판타지", color: "#7a9fc4", bgColor: "rgba(122,159,196,0.1)", borderColor: "rgba(122,159,196,0.35)", icon: "🧙" },
      { id: "modern", name: "현대", color: "#8fba8a", bgColor: "rgba(143,186,138,0.1)", borderColor: "rgba(143,186,138,0.35)", icon: "🏙️" },
      { id: "romance", name: "로맨스", color: "#c47fa5", bgColor: "rgba(196,127,165,0.1)", borderColor: "rgba(196,127,165,0.35)", icon: "💕" },
      { id: "horror", name: "공포", color: "#f07070", bgColor: "rgba(180,60,60,0.15)", borderColor: "rgba(180,60,60,0.35)", icon: "💀" },
      { id: "sf", name: "SF", color: "#7ae0d4", bgColor: "rgba(74,184,168,0.12)", borderColor: "rgba(74,184,168,0.35)", icon: "🚀" },
      { id: "mystery", name: "미스터리", color: "#c0aee8", bgColor: "rgba(160,140,200,0.15)", borderColor: "rgba(160,140,200,0.35)", icon: "👻" },
      { id: "history", name: "역사", color: "#e0c870", bgColor: "rgba(197,168,74,0.12)", borderColor: "rgba(197,168,74,0.35)", icon: "🏛️" },
      { id: "psychology", name: "심리", color: "#f0a0b8", bgColor: "rgba(224,90,122,0.12)", borderColor: "rgba(224,90,122,0.35)", icon: "🌀" }
    ]
  };

  const { error: insertError } = await supabase
    .from('config')
    .upsert({ id: 'genre_config', value: genreConfig });

  if (insertError) {
    console.error('Failed to insert genre_config:', insertError);
    process.exit(1);
  }

  console.log('✓ genre_config inserted');

  // Step 4: Verify
  console.log('\nVerifying migration...');
  const { data: config, error: configError } = await supabase
    .from('config')
    .select('id, value')
    .in('id', ['gameplay_config', 'genre_config']);

  if (configError) {
    console.error('Verification failed:', configError);
    process.exit(1);
  }

  console.log('\nMigration completed successfully!');
  for (const row of config || []) {
    const value = row.value as any;
    console.log(`\n${row.id}:`);
    if (row.id === 'gameplay_config') {
      console.log(`  - available_models: ${value.available_models?.length || 0}`);
      console.log(`  - input_modes: ${value.input_modes?.length || 0}`);
      console.log(`  - status_attribute_types: ${value.status_attribute_types?.length || 0}`);
      console.log(`  - default_suggestions: ${value.default_suggestions?.length || 0}`);
      console.log(`  - character_relations: ${value.character_relations?.length || 0}`);
      console.log(`  - memory_categories: ${value.memory_categories?.length || 0}`);
    } else if (row.id === 'genre_config') {
      console.log(`  - genres: ${value.genres?.length || 0}`);
    }
  }
}

applyMigration().catch(console.error);
