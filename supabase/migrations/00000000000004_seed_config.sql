-- Seed default config values (from supabase-schema.sql, adapted for story_game schema)

INSERT INTO story_game.config (id, value) VALUES ('prompt_config', '{
  "system_preamble": "당신은 인터랙티브 소설 게임의 AI 스토리텔러입니다.\n아래 설정을 기반으로 몰입감 있는 소설을 진행하세요.\n\n사용자가 행동을 입력하면 그에 따라 이야기를 이어가세요.\n각 응답은 소설체로 작성하세요.",
  "latex_rules": "[LaTeX 연출 규칙]\n대사와 효과음에 LaTeX 수식 문법을 사용하여 시각적으로 연출하세요.\n반드시 $ 기호로 감싸서 인라인 수식으로 작성합니다.\n\n■ 대사 작성 형식:\n발화자 이름과 대사를 반드시 하나의 $ 안에 함께 포함하세요.\n형식: $\\text{발화자: }\\textsf{\\textbf{\"대사 내용\"}}$\n잘못된 예: 사내 $\\textsf{\\textbf{\"대사\"}}$ (발화자가 $ 밖에 있음 ✗)\n올바른 예: $\\text{사내: }\\textsf{\\textbf{\"대사\"}}$ (발화자가 $ 안에 있음 ✓)\n\n■ 대사 감정 연출:\n- 일반 대사: $\\text{이름: }\\textsf{\\textbf{\"대사 내용\"}}$\n- 귓속말/속삭임: $\\text{이름: }\\color{gray}\\small\\textsf{\\textbf{\"속삭이는 내용\"}}$\n- 외침/비명: $\\text{이름: }\\huge\\textsf{\\textbf{\"외치는 내용!\"}}$\n- 분노/격앙: $\\text{이름: }\\large\\color{red}\\textsf{\\textbf{\"분노하는 내용!\"}}$\n- 부끄러움/유혹: $\\text{이름: }\\color{lightpink}\\textsf{\\textbf{\"부끄러운 내용\"}}$\n- 슬픔/비탄: $\\text{이름: }\\color{SteelBlue}\\textsf{\\textbf{\"슬픈 내용...\"}}$\n- 냉소/조롱: $\\text{이름: }\\color{darkviolet}\\textit{\\textsf{\"냉소적인 내용\"}}$\n- 위압/경고: $\\text{이름: }\\Large\\color{darkred}\\textsf{\\textbf{\"위압적인 내용\"}}$\n- 신비/예언: $\\text{이름: }\\color{gold}\\mathcal{\\text{신비로운 내용}}$\n\n■ 효과 연출:\n- 효과음/환경음: $\\colorbox{black}{\\color{cyan}\\small\\text{효과음}}$\n- 시스템/알림: $\\fcolorbox{gray}{black}{\\color{lime}\\footnotesize\\text{시스템 메시지}}$\n- 취소선(부정/철회): $\\cancel{\\text{취소된 내용}}$\n- 강조/각성: $\\boxed{\\color{orange}\\textbf{\\text{강조 내용}}}$\n\n■ 주의사항 (매우 중요 - 반드시 준수):\n- 모든 LaTeX 표현은 반드시 $ 기호로 열고 닫아야 합니다. $가 없으면 렌더링되지 않습니다!\n- 잘못된 예: \\text{이름: }\\textsf{\\textbf{\"대사\"}} ($ 없음 ✗)\n- 올바른 예: $\\text{이름: }\\textsf{\\textbf{\"대사\"}}$ ($ 있음 ✓)\n- LaTeX 수식($...$) 내부에 줄바꿈을 절대 넣지 마세요. 반드시 한 줄로 작성!\n- 발화자 이름은 반드시 $ 안에 \\text{이름: } 형태로 포함하세요.\n- HTML 태그나 &quot; 같은 HTML 엔티티는 절대 사용하지 마세요. 따옴표는 그냥 \"를 쓰세요.\n- 지문/나레이션은 LaTeX 없이 일반 텍스트로 작성하세요.\n- 대사에만 LaTeX를 적용하세요. 남용하지 마세요.",
  "narrative_length_template": "[!!! 서술 분량 규칙 - 최우선 필수 준수 !!!]\n반드시 매 응답마다 지문/묘사 문단을 정확히 {nl}문단으로 작성하세요.\n각 문단은 최소 3문장 이상으로 충분히 풍부하게 서술하세요.\n대사는 문단 수에 포함하지 않습니다. 대사와 대사 사이에도 상황 묘사, 표정, 심리, 분위기 등을 지문으로 충분히 서술하세요.\n{nl}문단보다 짧거나 길게 쓰지 마세요. 이 규칙은 절대적이며, 어떤 상황에서도 예외 없이 지켜야 합니다.\n상태창, 시스템 표시 등은 문단 수에 포함하지 않습니다.",
  "summary_system_instruction": "당신은 이야기 요약 전문가입니다. 핵심 줄거리, 캐릭터 상태, 중요 사건을 간결하게 요약하세요. {max_chars}자 이내.",
  "summary_request_new": "아래 대화 내용을 핵심 줄거리, 중요 사건, 캐릭터 상태 변화 중심으로 요약해주세요.",
  "summary_request_update": "기존 요약:\n{summary}\n\n아래 새로운 대화를 기존 요약에 통합하여 업데이트해주세요.",
  "game_start_message": "게임을 시작해줘",
  "safety_settings": [{"category":"HARM_CATEGORY_SEXUALLY_EXPLICIT","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_HATE_SPEECH","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_HARASSMENT","threshold":"BLOCK_NONE"},{"category":"HARM_CATEGORY_DANGEROUS_CONTENT","threshold":"BLOCK_NONE"}],
  "cache_ttl": "3600s"
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO story_game.config (id, value) VALUES ('gameplay_config', '{
  "default_narrative_length": 3,
  "narrative_length_min": 1,
  "narrative_length_max": 10,
  "sliding_window_size": 20,
  "max_history": 20,
  "message_limit": 500,
  "message_warning_threshold": 300,
  "summary_trigger_offset": 10,
  "summary_max_chars": 500,
  "auto_save_interval_ms": 300000,
  "max_session_list": 50
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
