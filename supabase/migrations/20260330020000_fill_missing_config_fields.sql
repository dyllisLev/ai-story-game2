-- ============================================================
-- Fill missing prompt_config and gameplay_config fields
-- Uses jsonb merge (||) to add missing fields WITHOUT overwriting existing ones
-- ============================================================

-- Add missing fields to prompt_config
UPDATE story_game.config
SET value = (
  -- Build object of only the missing keys, then merge onto existing value
  -- Existing keys take precedence because we put new_fields || existing
  -- Actually we want existing to win, so: new_defaults || existing value
  '{
    "latex_rules": "[LaTeX 서식 규칙]\n효과음과 배경음에 LaTeX 수식 문법을 사용하여 시각적으로 연출하세요.\n반드시 $ 기호로 감싸서 인라인 수식으로 작성합니다.\n\n■ 소리 연출:\n- 큰 소리/외침/폭발음: $\\huge\\textsf{\\textbf{쾅!!!}}$\n- 작은 소리/속삭임/미세한 소리: $\\color{gray}\\small\\textsf{사각사각...}$\n- 주변 배경음/환경음: $\\colorbox{black}{\\color{cyan}\\small\\text{바람 소리가 윙윙 분다}}$\n\n■ 주의사항:\n- 모든 LaTeX 표현은 반드시 $ 기호로 열고 닫아야 합니다.\n- LaTeX 수식($...$) 내부에 줄바꿈을 절대 넣지 마세요. 반드시 한 줄로 작성!\n- 지문/나레이션/대사는 LaTeX 없이 일반 텍스트로 작성하세요.\n- 효과음/배경음에만 LaTeX를 적용하세요. 남용하지 마세요.",
    "narrative_length_template": "[!!! 서술 분량 규칙 - 최우선 필수 준수 !!!]\n반드시 매 응답마다 지문/묘사 문단을 정확히 {nl}문단으로 작성하세요.\n각 문단은 최소 3문장 이상으로 충분히 풍부하게 서술하세요.\n대사는 문단 수에 포함하지 않습니다. 대사와 대사 사이에도 상황 묘사, 표정, 심리, 분위기 등을 지문으로 충분히 서술하세요.\n{nl}문단보다 짧거나 길게 쓰지 마세요. 이 규칙은 절대적이며, 어떤 상황에서도 예외 없이 지켜야 합니다.\n상태창, 시스템 표시 등은 문단 수에 포함하지 않습니다.",
    "memory_system_instruction": "당신은 이야기 요약 전문가입니다. 핵심 줄거리, 캐릭터 상태, 중요 사건을 간결하게 요약하세요. {max_chars}자 이내.",
    "memory_request": "아래 대화 내용을 핵심 줄거리, 중요 사건, 캐릭터 상태 변화 중심으로 요약해주세요.",
    "safety_settings": [{"category":"HARM_CATEGORY_SEXUALLY_EXPLICIT","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_HATE_SPEECH","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_HARASSMENT","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_DANGEROUS_CONTENT","threshold":"BLOCK_NONE"}]
  }'::jsonb || value
),
updated_at = now()
WHERE id = 'prompt_config';

-- Add missing field to gameplay_config: memory_short_term_max
UPDATE story_game.config
SET value = (
  '{"memory_short_term_max": 10}'::jsonb || value
),
updated_at = now()
WHERE id = 'gameplay_config';
