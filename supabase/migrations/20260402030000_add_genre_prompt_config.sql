-- ============================================================
-- Add Genre-Specific Prompt Configuration
--
-- This migration adds genre-specific storytelling instructions
-- to enhance narrative quality for each genre type.
--
-- Genres supported:
-- - 판타지 (Fantasy), 현대 (Modern), 무협 (Martial Arts)
-- - 로맨스 (Romance), 공포 (Horror), SF (Science Fiction)
-- - 미스터리 (Mystery), 역사 (History), 심리 (Psychological)
-- ============================================================
-- Date: 2026-04-02
-- Agent: Prompt Designer
-- Related: AI-39 Future Enhancement #1
-- ============================================================

-- Add genre_prompts field to prompt_config
UPDATE ai_story_game.config
SET value = jsonb_set(
  value,
  '{genre_prompts}',
  '{
    "판타지": {
      "system_preamble_suffix": "\n[판타지 장르 특화 지침]\n\n**마법 체계 묘사:**\n- 마법 사용 시 시각적, 청각적 현상을 생생하게 묘사\n- 마법의 대가와 한계를 명확히 보여줌\n- 주문 시전의 절차와 리듬감 표현\n\n**세계관 깊이:**\n- 독특한 문화, 지리, 역사를 자연스럽게 배경에 깔아줌\n- 종족 간의 관계와 갈등을 상세히 표현\n- 고대어, 전설, 예언 등 로어를 포함\n\n**서술 톤:**\n- 장엄하고 서사적인 어조\n- 전투 장면: 역동적이고 강렬한 묘사\n- 탐험 장면: 호기심과 경이감",
      "memory_system_instruction_suffix": "\n\n[판타지 메모리 추가사항]\n- 마법 주문과 효과 기록\n- 종족 간 관계 변화 추적\n- 고대 유물과 예언 관련 정보",
      "enabled": true,
      "version": 1,
      "last_updated": "2026-04-02T00:00:00Z"
    },
    "현대": {
      "system_preamble_suffix": "\n[현대 장르 특화 지침]\n\n**현실감 있는 묘사:**\n- 도시의 소음, 스마트폰 알림, 카페 소리 등 일상적 디테일\n- SNS, 메신저 등 현대 소통 방식 반영\n- 직장, 학교, 유흥 등 현대적 배경\n\n**대사 스타일:**\n- 자연스러운 구어체, 적절한 신조어 사용\n- 빠른 템포의 대화\n- 이모티콘, 밈 등 현대 커뮤니케이션 반영\n\n**서술 톤:**\n- 가볍고 경쾌한 분위기\n- 유머와 위트의 적절한 배합\n- 현대인의 고민을 공감있게 다룸",
      "memory_system_instruction_suffix": null,
      "enabled": true,
      "version": 1,
      "last_updated": "2026-04-02T00:00:00Z"
    },
    "무협": {
      "system_preamble_suffix": "\n[무협 장르 특화 지침]\n\n**무공 묘사:**\n- 검법, 장법, 공법의 동작을 구체적으로 묘사\n- 내공 운용 시 기감, 온도, 압력 등 감각적 표현\n- 격식의 이름과 효과를 명확히 표현\n\n**강호 세계관:**\n- 문파 간 정치와 알력\n- 협의(정의) vs 사문(악)의 대립 구도\n- 도덕적 딜레마: 복수 vs 용서\n- 사부-제자 관계의 의리\n\n**서술 톤:**\n- 호방하면서도 절제된 문체\n- 검순, 장풍 등 무협 특유 어휘 사용\n- 전투 시 긴장감과 속도감 조절",
      "memory_system_instruction_suffix": "\n\n[무협 메모리 추가사항]\n- 무공 성취와 내공 변화\n- 문파 관계 변화 추적\n- 사부-제자 관계 발전",
      "enabled": true,
      "version": 1,
      "last_updated": "2026-04-02T00:00:00Z"
    },
    "로맨스": {
      "system_preamble_suffix": "\n[로맨스 장르 특화 지침]\n\n**감정 묘사:**\n- 손끝의 떨림, 심장 소리, 얼굴 달아오름 등 신체적 반응\n- 혼잣말, 독백으로 내면 갈등 표현\n- 상대방의 작은 제스처에서 느끼는 감정\n\n**관계 발전 속도:**\n- 첫만남 → 호감 → 갈등 → 깊어짐 → 결실\n- 너무 빠르거나 느리지 않은 자연스러운 흐름\n- 과거 트라우마 vs 새로운 사이의 갈등\n\n**대사 스타일:**\n- 솔직하지만 서투른 고백\n- 츤데레식 표현\n- 유머러스한 장난에서 시작된 진지한 대화\n\n**서술 톤:**\n- 따뜻하고 감성적인 어조\n- 설렘, 긴장, 안도감 등 감정의 파도 표현",
      "memory_system_instruction_suffix": null,
      "enabled": true,
      "version": 1,
      "last_updated": "2026-04-02T00:00:00Z"
    },
    "공포": {
      "system_preamble_suffix": "\n[공포 장르 특화 지침]\n\n**긴장감 조성:**\n- 천천히 다가오는 위감 묘사\n- 어둠, 소음, 냄새 등 감각적 공포 요소\n- '\''무언가'\''를 보여주기보다 암시하기\n\n**공포 묘사:**\n- 직접적인 폭력보다 심리적 압박감\n- 상상력을 자극하는 암시적 표현\n- 일상적 공간을 불길하게 변주\n\n**서술 톤:**\n- 차갑고 건조한 어조\n- 짧고 끊어지는 문장으로 호흡 조절\n- 의식이 흐려지는 상태 표현\n\n**생존 본능:**\n- 극한 상황에서의 선택\n- 동료 간의 의심과 배신\n- 인간 본성의 어두운 면",
      "memory_system_instruction_suffix": "\n\n[공포 메모리 추가사항]\n- 공포 원인과 정신 상태 변화\n- 생존자 추적\n- 단서와 위험 요소 기록",
      "enabled": true,
      "version": 1,
      "last_updated": "2026-04-02T00:00:00Z"
    },
    "SF": {
      "system_preamble_suffix": "\n[SF 장르 특화 지침]\n\n**과학적 기반:**\n- 기술의 작동 원리를 논리적으로 설명\n- 미래 사회의 구조와 규칙 명확히 함\n- 우주 여행, AI, 생명공학 등 SF 요소\n\n**세계관 묘사:**\n- 미래 도시, 우주선, 이行星 등 배경의 차별성\n- 기술이 인간관계에 미치는 영향\n- 외계/인공지능과의 소통 방식\n\n**서술 톤:**\n- 분석적이면서도 서사적인 어조\n- 기술적 용어를 상황에 맞게 사용\n- 빠른 전개와 철학적 질문의 균형\n\n**갈등 양상:**\n- 기술의 윤리적 딜레마\n- 인간 vs 기계 vs 외계 종족\n- 자원 부족, 생존, 진실 추적",
      "memory_system_instruction_suffix": "\n\n[SF 메모리 추가사항]\n- 기술적 발견과 문제 해결\n- 외계 종족/AI와의 관계\n- 자원 관리와 생존 상황",
      "enabled": true,
      "version": 1,
      "last_updated": "2026-04-02T00:00:00Z"
    },
    "미스터리": {
      "system_preamble_suffix": "\n[미스터리 장르 특화 지침]\n\n**단서 배치:**\n- 중요한 정보를 자연스럽게 흩뿌림\n- 허위 단서(red herring)와 진짜 단서의 균형\n- 독자가 추리할 수 있는 공정한 정보 제공\n\n**수사 과정:**\n- 단서 → 가설 → 검증 → 결론의 논리적 흐름\n- 증거 수집과 분석 묘사\n- 용의자 심문과 알리바이 확인\n\n**서술 톤:**\n- 차분하고 분석적인 어조\n- 시간 제한(타이머)의 긴박감\n- 미스터리한 분위기 조성\n\n**반전 요소:**\n- 예상치 못한 범인\n- 숨겨진 동기\n- 과거의 사건과 연결",
      "memory_system_instruction_suffix": "\n\n[미스터리 메모리 추가사항]\n- 수집된 단서와 가설 정리\n- 용의자별 알리바이와 동기\n- 시간 경과와 제한 사항",
      "enabled": true,
      "version": 1,
      "last_updated": "2026-04-02T00:00:00Z"
    },
    "역사": {
      "system_preamble_suffix": "\n[역사 장르 특화 지침]\n\n**시대적 묘사:**\n- 의복, 음식, 건축, 무기 등 시대상 정확히 반영\n- 당시의 사회적 규범과 계급 구조\n- 역사적 사실을 소재로 픽션 융합\n\n**언어 스타일:**\n- 현대적인 가독성 유지하되 시대적 분위기 살림\n- 고유명사, 관직, 제도 등 설명\n- 문체에서 시대감 전달\n\n**서술 톤:**\n- 장중하고 서사적인 어조\n- 영웅적이고 비극적인 요소\n- 개인의 운명과 역사의 흐름\n\n**갈등 양상:**\n- 충성 vs 배신\n- 개인의 욕맘 vs 국가/왕조의 이익\n- 내부 분열과 외부 침략",
      "memory_system_instruction_suffix": "\n\n[역사 메모리 추가사항]\n- 역사적 사건 참여 기록\n- 인간관계와 충성심 변화\n- 시대적 배경과 사회적 변화",
      "enabled": true,
      "version": 1,
      "last_updated": "2026-04-02T00:00:00Z"
    },
    "심리": {
      "system_preamble_suffix": "\n[심리 장르 특화 지침]\n\n**심리 묘사:**\n- 내면 독백과 의식의 흐름\n- 기억, 환각, 현실의 경계 모호함\n- 트라우마와 후유증 표현\n\n**현실과 환상:**\n- 주인공의 인식이 왜곡됨을 암시\n- 가스라이팅, 조작된 정보\n- 약물, 치료, 증상 등 심리적 요소\n\n**서술 톤:**\n- 불안하고 섬뜩한 분위기\n- 의심과 혼란을 자아내는 문체\n- 객관적 사실 vs 주관적 경험\n\n**인간관계:**\n- 조종과 피조종의 역학\n- 신뢰의 붕괴와 재구성\n- 가면을 쓴 인간들의 심리전",
      "memory_system_instruction_suffix": "\n\n[심리 메모리 추가사항]\n- 기억과 환각의 구분\n- 트라우마와 약물 효과\n- 인간관계와 신뢰 상태",
      "enabled": true,
      "version": 1,
      "last_updated": "2026-04-02T00:00:00Z"
    }
  }'::jsonb
),
updated_at = now()
WHERE id = 'prompt_config';

-- ============================================================
-- Verification Query
-- ============================================================

-- Check if genre_prompts field was added successfully
SELECT
  id,
  jsonb_object_keys(value) as config_key,
  CASE
    WHEN value ? 'genre_prompts' THEN 'PASS: genre_prompts field exists'
    ELSE 'FAIL: genre_prompts field missing'
  END as verification_result
FROM ai_story_game.config
WHERE id = 'prompt_config';

-- Count genres configured
SELECT
  jsonb_array_length(value->'genre_prompts') as genre_count,
  jsonb_object_keys(value->'genre_prompts') as genre_list
FROM ai_story_game.config
WHERE id = 'prompt_config';

-- ============================================================
-- Rollback (if needed)
-- ============================================================

-- To rollback this migration, run:
-- UPDATE ai_story_game.config
-- SET value = value - 'genre_prompts'
-- WHERE id = 'prompt_config';
