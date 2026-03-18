import { supabase } from './supabase-config.js';
import { escapeHtml } from './utils.js';
import { initTheme } from './theme.js';

const storyGrid = document.getElementById('storyGrid');
const storyCount = document.getElementById('storyCount');

// --- Load Stories from Supabase ---
async function loadStories() {
  if (!supabase) {
    storyGrid.innerHTML = '<div class="empty-state"><div class="icon">&#9888;</div><p>Supabase가 설정되지 않았습니다.</p></div>';
    return;
  }

  try {
    const { data: rows, error } = await supabase
      .from('stories')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    const stories = (rows || []).map(row => ({
      id: row.id,
      title: row.title,
      worldSetting: row.world_setting,
      story: row.story,
      characterName: row.character_name,
      characterSetting: row.character_setting,
      characters: row.characters,
      useLatex: row.use_latex,
      isPublic: row.is_public,
      createdAt: row.created_at,
    }));

    storyCount.textContent = `(${stories.length})`;

    if (stories.length === 0) {
      storyGrid.innerHTML = `
        <div class="empty-state">
          <div class="icon">&#128214;</div>
          <p>등록된 스토리가 없습니다.<br>첫 번째 스토리를 만들어 보세요!</p>
          <a href="editor.html" class="btn btn-primary">+ 새 스토리 작성</a>
        </div>`;
      return;
    }

    storyGrid.innerHTML = '';
    for (const story of stories) {
      const card = document.createElement('div');
      card.className = 'story-card';
      card.addEventListener('click', () => {
        window.location.href = `play.html?storyId=${story.id}`;
      });

      const preview = story.worldSetting || story.story || '';
      const previewClean = preview.replace(/[#\n\\n]/g, ' ').trim().slice(0, 150);

      const hasPassword = !!story.passwordHash;
      const createdDate = story.createdAt?.toDate?.()
        ? story.createdAt.toDate().toLocaleDateString('ko-KR')
        : '';

      card.innerHTML = `
        <div class="story-title">${escapeHtml(story.title || '제목 없음')}</div>
        <div class="story-preview">${escapeHtml(previewClean || '설명 없음')}</div>
        <div class="story-meta">
          <span class="story-id">${story.id.slice(0, 8)}...</span>
          <div class="story-tags">
            ${story.characterName ? `<span class="story-tag">${escapeHtml(story.characterName)}</span>` : ''}
            ${hasPassword ? '<span class="story-tag locked">&#128274; 암호</span>' : ''}
            ${createdDate ? `<span style="font-size:10px;color:var(--text-muted);">${createdDate}</span>` : ''}
          </div>
        </div>`;

      storyGrid.appendChild(card);
    }
  } catch (e) {
    console.error('Story load failed:', e);
    storyGrid.innerHTML = '<div class="empty-state"><div class="icon">&#9888;</div><p>스토리 로드에 실패했습니다.</p></div>';
  }
}

// --- Load Recent Sessions from localStorage ---
function loadSessions() {
  const SESSION_LIST_KEY = 'ai-story-game-sessions';
  try {
    const list = JSON.parse(localStorage.getItem(SESSION_LIST_KEY) || '[]');
    if (list.length === 0) return;

    const section = document.getElementById('sessionSection');
    const container = document.getElementById('sessionList');
    section.style.display = 'block';

    for (const s of list.slice(0, 10)) {
      const item = document.createElement('div');
      item.className = 'session-item';
      item.addEventListener('click', () => {
        window.location.href = `play.html?sessionId=${s.sessionId}`;
      });

      const time = new Date(s.lastPlayedAt).toLocaleString('ko-KR');

      item.innerHTML = `
        <div class="session-info">
          <span class="session-title">${escapeHtml(s.title || '제목 없음')}</span>
          <span class="session-time">${time}</span>
        </div>
        <span class="session-resume">이어하기 &rarr;</span>`;

      container.appendChild(item);
    }
  } catch (e) {}
}

// --- Theme ---
initTheme();

// --- Continue Banner ---
function showContinueBanner() {
  const SESSION_LIST_KEY = 'ai-story-game-sessions';
  try {
    const list = JSON.parse(localStorage.getItem(SESSION_LIST_KEY) || '[]');
    if (list.length === 0) return;
    const latest = list[0]; // Already sorted by lastPlayedAt
    document.getElementById('continueBanner').style.display = 'flex';
    document.getElementById('continueTitle').textContent = latest.title || '제목 없음';
    document.getElementById('continueTime').textContent = new Date(latest.lastPlayedAt).toLocaleString('ko-KR');
    document.getElementById('btnContinue').addEventListener('click', () => {
      window.location.href = `play.html?sessionId=${latest.sessionId}`;
    });
  } catch (e) {}
}

// --- Init ---
showContinueBanner();
loadStories();
loadSessions();
