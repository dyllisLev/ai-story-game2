#!/usr/bin/env tsx
/**
 * Demo Quality Test - Genre Quality Testing
 *
 * This script tests 3 scenarios to verify Gemini API integration and story generation quality.
 *
 * Usage:
 *   GEMINI_MODEL=gemini-2.5-flash pnpm exec tsx scripts/demo-quality-test.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

interface Scenario {
  id: string;
  title: string;
  genre: string;
  difficulty: string;
}

/**
 * Call Gemini API directly
 */
async function callGeminiAPI(contents: string[]): Promise<any> {
  const apiKey = process.env.GEMINI_API || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found in environment');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents.map(text => ({ role: 'user', parts: [{ text }] })),
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${error}`);
  }

  return await response.json();
}

/**
 * Fetch prompt config from database
 */
async function getPromptConfig() {
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('id', 'prompt_config')
    .single();

  if (error) throw error;
  return data.value;
}

/**
 * Build prompt for scenario
 */
function buildPrompt(scenario: Scenario, config: any): string {
  const genreConfig = config.genre_prompts?.[scenario.genre];
  if (!genreConfig) {
    throw new Error(`Genre ${scenario.genre} not found in prompt config`);
  }

  return `${genreConfig.system_prompt}

Please write a short opening scene (200-500 characters) for a ${scenario.difficulty} ${scenario.genre} story titled "${scenario.title}".

Focus on:
1. Establishing the setting and atmosphere
2. Introducing the main character
3. Setting up an initial conflict or mystery

Write in Korean.`;
}

/**
 * Test scenario
 */
async function testScenario(scenario: Scenario): Promise<{ success: boolean; length: number; time: number }> {
  const startTime = Date.now();

  try {
    const config = await getPromptConfig();
    const prompt = buildPrompt(scenario, config);

    const response = await callGeminiAPI([prompt]);

    const generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const duration = Date.now() - startTime;

    return {
      success: true,
      length: generatedText.length,
      time: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`    ❌ Error: ${error}`);
    return {
      success: false,
      length: 0,
      time: duration
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🎯 Genre Quality Test - Demo Execution\n');
  console.log('📊 Testing 3 scenarios\n');

  // Load configuration
  console.log('⏳ Loading prompt configuration...');
  await getPromptConfig();
  console.log('✅ Configuration loaded\n');

  // Test scenarios
  const scenarios: Scenario[] = [
    {
      id: '1',
      title: \"The Apprentice's First Spell\",
      genre: 'fantasy',
      difficulty: 'basic'
    },
    {
      id: '2',
      title: 'The Workplace Dilemma',
      genre: 'modern',
      difficulty: 'medium'
    },
    {
      id: '3',
      title: 'The Time Paradox',
      genre: 'scifi',
      difficulty: 'advanced'
    }
  ];

  const results = [];

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    console.log(`[${i + 1}/${scenarios.length}] ${scenario.title}`);
    console.log(`    Genre: ${scenario.genre} | Difficulty: ${scenario.difficulty}`);
    console.log(`    ⏳ Generating story...`);

    const result = await testScenario(scenario);
    results.push(result);

    if (result.success) {
      console.log(`    ✅ Generated ${result.length} chars in ${result.time}ms`);
    } else {
      console.log(`    ❌ Generation failed after ${result.time}ms`);
    }
    console.log();
  }

  // Summary
  console.log('✅ Demo test completed!');
  console.log('📊 Summary:');
  const successful = results.filter(r => r.success);
  console.log(`   Total stories: ${results.length}`);
  console.log(`   Success: ${successful.length}/${results.length}`);
  if (successful.length > 0) {
    const avgLength = successful.reduce((sum, r) => sum + r.length, 0) / successful.length;
    const avgTime = successful.reduce((sum, r) => sum + r.time, 0) / successful.length;
    console.log(`   Avg length: ${Math.round(avgLength)} chars`);
    console.log(`   Avg time: ${Math.round(avgTime)}ms`);
  }
}

main().catch(console.error);
