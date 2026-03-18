export function initTheme() {
  const theme = localStorage.getItem('ai-story-game-theme') || 'system';
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else if (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.body.classList.add('light-theme');
  }
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (localStorage.getItem('ai-story-game-theme') === 'system') {
      document.body.classList.toggle('light-theme', window.matchMedia('(prefers-color-scheme: light)').matches);
    }
  });
}
