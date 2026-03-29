export const TEST_DATA = {
  get storyId() {
    return process.env.TEST_STORY_ID || '';
  },
  adminUsername: 'admin',
  knownGenres: ['전체', '무협', '판타지', '현대', '로맨스', '공포', 'SF', '미스터리', '역사', '심리'] as const,
  sortOptions: ['latest', 'popular', 'name'] as const,
};
