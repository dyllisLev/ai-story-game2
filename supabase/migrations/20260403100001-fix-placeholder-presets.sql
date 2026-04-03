-- Fix placeholder presets (AI-260)
-- Update 3 story presets that have "--stdin" placeholder text

-- 1. 왕국 건설: 방랑한 기사의 여정
UPDATE ai_story_game.stories
SET
  worldview = '중세 판타지 세계관. 왕국들이 분열되어 있고, 마법사와 기사들이 공존하는 시대. 플레이어는 방랑하는 기사로서 황무지가 된 땅에 자신만의 왕국을 건설하는 여정을 시작합니다.',
  story = '당신은 한때 위대한 왕국의 기사였으나, 왕국의 멸망 후 방랑자가 되었습니다. 황무지가 된 땅에 도착한 당신은 잃어버린 영광을 되찾고 새로운 왕국을 건설하기로 결심합니다. 주변 마을 사람들의 도움을 받아 작은 요새를 짓고, 몬스터의 위협으로부터 사람들을 보호하며 왕국의 기초를 다집니다. 점차 더 많은 사람들이 모여들고, 당신의 리더십을 따르게 됩니다. 하지만 인근의 다른 영주들이 당신의 성장을 경계하며 위협적으로 변해갑니다. 외세의 침공과 내부의 반란 속에서 당신은 진정한 왕이 되어갑니다.',
  updated_at = NOW()
WHERE id = '8ff54116-ee80-405d-b02b-d3eac098b70c';

-- 2. 몬스터 마을의 영웅
UPDATE ai_story_game.stories
SET
  worldview = '인간과 몬스터가 공존하는 마을 ''그림자 계곡''. 편견과 차별 속에서 평화롭게 살아가는 몬스터들의 마을에 인간 영웅이 찾아옵니다.',
  story = '당신은 여행자로서 그림자 계곡이라는 이상한 마을에 발을 들였습니다. 이 마을에는 인간을 피해 숨어사는 몬스터들이 평화롭게 공존하고 있었습니다. 처음에는 경계심을 가졌던 몬스터들도, 당신의 선의를 점차 받아들이기 시작합니다. 하지만 인간 세계의 영주들이 이 마을의 존재를 알게 되면서, ''위험한 몬스터를 소탕하라''는 명분으로 군대를 보냅니다. 당신은 선택의 기로에 섭니다. 인간 편에 서서 몬스터들을 배신할 것인가, 아니면 몬스터 마을을 지켜 인간들과 맞서 싸울 것인가?',
  updated_at = NOW()
WHERE id = '453a2a96-235b-458d-8817-beea2c2583ee';

-- 3. 이세계 소환
UPDATE ai_story_game.stories
SET
  worldview = '현대 일본에서 살던 고등학생이 신비한 힘에 의해 이세계로 소환됩니다. 마법과 몬스터가 존재하는 판타지 세계관.',
  story = '평범한 고등학생이었던 당신은 어느 날 갑자기 빛에 휩싸여 낯선 세계에 떨어졌습니다. 마법을 사용할 수 있는 사람들, 몬스터, 그리고 공주를 구해야 하는 운명. 당신은 소환된 세계에서 특별한 힘을 발견합니다. 현대 지식과 마법 능력을 결합하여, 마왕을 물리치고 공주를 구하며 세계를 구원的英雄이 됩니다. 하지만 이 모든 것이 너무나 편안하게 느껴집니다. 당신은 정말로 우연히 소환된 것일까요, 아니면 누군가가 계획한 것일까요?',
  updated_at = NOW()
WHERE id = '589c1bf6-8988-4845-a1dd-f4fc1e5cc404';

-- Verify updates
SELECT
  id,
  title,
  LEFT(story, 50) as story_preview,
  CASE WHEN story = '--stdin' THEN 'STILL PLACEHOLDER' ELSE 'FIXED' END as status
FROM ai_story_game.stories
WHERE id IN (
  '8ff54116-ee80-405d-b02b-d3eac098b70c',
  '453a2a96-235b-458d-8817-beea2c2583ee',
  '589c1bf6-8988-4845-a1dd-f4fc1e5cc404'
);
