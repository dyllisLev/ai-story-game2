/**
 * Seed genre_config data
 * This script inserts the genre configuration into the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root directory
import { config } from 'dotenv';
const envPath = join(__dirname, '../.env');
config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'ai_story_game'
  }
});

async function seedGenreConfig() {
  try {
    console.log('Seeding genre_config...');

    // Check if genre_config already exists
    const { data: existing, error: checkError } = await supabase
      .from('config')
      .select('id')
      .eq('id', 'genre_config')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      console.log('genre_config already exists, updating...');
    }

    // Genre configuration data
    const genreConfigValue = {
      genres: [
        {
          id: "moo",
          name: "무협",
          color: "#c49a3c",
          bgColor: "rgba(196,154,60,0.1)",
          borderColor: "rgba(196,154,60,0.35)",
          icon: "⚔️"
        },
        {
          id: "fantasy",
          name: "판타지",
          color: "#7a9fc4",
          bgColor: "rgba(122,159,196,0.1)",
          borderColor: "rgba(122,159,196,0.35)",
          icon: "🧙"
        },
        {
          id: "modern",
          name: "현대",
          color: "#8fba8a",
          bgColor: "rgba(143,186,138,0.1)",
          borderColor: "rgba(143,186,138,0.35)",
          icon: "🏙️"
        },
        {
          id: "romance",
          name: "로맨스",
          color: "#c47fa5",
          bgColor: "rgba(196,127,165,0.1)",
          borderColor: "rgba(196,127,165,0.35)",
          icon: "💕"
        },
        {
          id: "horror",
          name: "공포",
          color: "#f07070",
          bgColor: "rgba(180,60,60,0.15)",
          borderColor: "rgba(180,60,60,0.35)",
          icon: "💀"
        },
        {
          id: "sf",
          name: "SF",
          color: "#7ae0d4",
          bgColor: "rgba(74,184,168,0.12)",
          borderColor: "rgba(74,184,168,0.35)",
          icon: "🚀"
        },
        {
          id: "mystery",
          name: "미스터리",
          color: "#c0aee8",
          bgColor: "rgba(160,140,200,0.15)",
          borderColor: "rgba(160,140,200,0.35)",
          icon: "👻"
        },
        {
          id: "history",
          name: "역사",
          color: "#e0c870",
          bgColor: "rgba(197,168,74,0.12)",
          borderColor: "rgba(197,168,74,0.35)",
          icon: "🏛️"
        },
        {
          id: "psychology",
          name: "심리",
          color: "#f0a0b8",
          bgColor: "rgba(224,90,122,0.12)",
          borderColor: "rgba(224,90,122,0.35)",
          icon: "🌀"
        }
      ]
    };

    // Insert or update genre_config
    const { error: upsertError } = await supabase
      .from('config')
      .upsert({
        id: 'genre_config',
        value: genreConfigValue
      }, {
        onConflict: 'id'
      });

    if (upsertError) {
      throw upsertError;
    }

    console.log('✅ genre_config seeded successfully!');
    console.log(`   Total genres: ${genreConfigValue.genres.length}`);

  } catch (error) {
    console.error('❌ Error seeding genre_config:', error);
    process.exit(1);
  }
}

seedGenreConfig();
