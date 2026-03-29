import type { FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig) {
  // Health check: backend must be running
  try {
    const res = await fetch('http://localhost:3000/api/health');
    if (!res.ok) throw new Error(`Backend health check failed: ${res.status}`);
    console.log('✓ Backend is running');
  } catch (e) {
    throw new Error(
      'Backend is not running on port 3000. Run ./dev.sh start first.\n' +
        (e instanceof Error ? e.message : String(e))
    );
  }

  // Health check: frontend must be running
  try {
    const res = await fetch('http://localhost:5173');
    if (!res.ok) throw new Error(`Frontend health check failed: ${res.status}`);
    console.log('✓ Frontend is running');
  } catch (e) {
    throw new Error(
      'Frontend is not running on port 5173. Run ./dev.sh start first.\n' +
        (e instanceof Error ? e.message : String(e))
    );
  }

  // Check if test stories exist, seed one if needed
  try {
    const res = await fetch('http://localhost:3000/api/stories?limit=1');
    const data = await res.json();
    const stories = data.data ?? data.stories ?? [];
    if (stories.length > 0) {
      process.env.TEST_STORY_ID = stories[0].id;
      console.log(`✓ Using existing story: ${stories[0].id}`);
    } else {
      console.log('⚠ No stories found in database. Some tests may be skipped.');
    }
  } catch {
    console.log('⚠ Could not fetch stories. Some tests may be skipped.');
  }
}

export default globalSetup;
