const LATEX_RULES = `[LaTeX 연출 규칙]
대사와 효과음에 LaTeX 수식 문법을 사용하여 시각적으로 연출하세요.
반드시 $ 기호로 감싸서 인라인 수식으로 작성합니다.

■ 대사 작성 형식:
발화자 이름과 대사를 반드시 하나의 $ 안에 함께 포함하세요.
형식: $\\text{발화자: }\\textsf{\\textbf{"대사 내용"}}$
잘못된 예: 사내 $\\textsf{\\textbf{"대사"}}$ (발화자가 $ 밖에 있음 ✗)
올바른 예: $\\text{사내: }\\textsf{\\textbf{"대사"}}$ (발화자가 $ 안에 있음 ✓)

■ 대사 감정 연출:
- 일반 대사: $\\text{이름: }\\textsf{\\textbf{"대사 내용"}}$
- 귓속말/속삭임: $\\text{이름: }\\color{gray}\\small\\textsf{\\textbf{"속삭이는 내용"}}$
- 외침/비명: $\\text{이름: }\\huge\\textsf{\\textbf{"외치는 내용!"}}$
- 분노/격앙: $\\text{이름: }\\large\\color{red}\\textsf{\\textbf{"분노하는 내용!"}}$
- 부끄러움/유혹: $\\text{이름: }\\color{lightpink}\\textsf{\\textbf{"부끄러운 내용"}}$
- 슬픔/비탄: $\\text{이름: }\\color{SteelBlue}\\textsf{\\textbf{"슬픈 내용..."}}$
- 냉소/조롱: $\\text{이름: }\\color{darkviolet}\\textit{\\textsf{"냉소적인 내용"}}$
- 위압/경고: $\\text{이름: }\\Large\\color{darkred}\\textsf{\\textbf{"위압적인 내용"}}$
- 신비/예언: $\\text{이름: }\\color{gold}\\mathcal{\\text{신비로운 내용}}$

■ 효과 연출:
- 효과음/환경음: $\\colorbox{black}{\\color{cyan}\\small\\text{효과음}}$
- 시스템/알림: $\\fcolorbox{gray}{black}{\\color{lime}\\footnotesize\\text{시스템 메시지}}$
- 취소선(부정/철회): $\\cancel{\\text{취소된 내용}}$
- 강조/각성: $\\boxed{\\color{orange}\\textbf{\\text{강조 내용}}}$

■ 주의사항 (매우 중요 - 반드시 준수):
- 모든 LaTeX 표현은 반드시 $ 기호로 열고 닫아야 합니다. $가 없으면 렌더링되지 않습니다!
- 잘못된 예: \\text{이름: }\\textsf{\\textbf{"대사"}} ($ 없음 ✗)
- 올바른 예: $\\text{이름: }\\textsf{\\textbf{"대사"}}$ ($ 있음 ✓)
- LaTeX 수식($...$) 내부에 줄바꿈을 절대 넣지 마세요. 반드시 한 줄로 작성!
- 발화자 이름은 반드시 $ 안에 \\text{이름: } 형태로 포함하세요.
- HTML 태그나 &quot; 같은 HTML 엔티티는 절대 사용하지 마세요. 따옴표는 그냥 "를 쓰세요.
- 지문/나레이션은 LaTeX 없이 일반 텍스트로 작성하세요.
- 대사에만 LaTeX를 적용하세요. 남용하지 마세요.`;

/**
 * 프롬프트 빌더
 * @param {object} fields - { worldSetting, story, characterName, characterSetting, characters, userNote, systemRules }
 * @param {object} options - { useLatex: boolean, narrativeLength?: number }
 * @returns {string}
 */
export function buildPrompt(fields, options = {}) {
  const { worldSetting, story, characterName, characterSetting, characters, userNote, systemRules } = fields;
  const w = (worldSetting || '').trim();
  const s = (story || '').trim();
  const cn = (characterName || '').trim();
  const cs = (characterSetting || '').trim();
  const ch = (characters || '').trim();
  const un = (userNote || '').trim();
  const sr = (systemRules || '').trim();

  let prompt = `당신은 인터랙티브 소설 게임의 AI 스토리텔러입니다.
아래 설정을 기반으로 몰입감 있는 소설을 진행하세요.

사용자가 행동을 입력하면 그에 따라 이야기를 이어가세요.
각 응답은 소설체로 작성하세요.`;

  if (options.narrativeLength) {
    const nl = options.narrativeLength;
    prompt += `\n\n[!!! 서술 분량 규칙 - 최우선 필수 준수 !!!]
반드시 매 응답마다 지문/묘사 문단을 정확히 ${nl}문단으로 작성하세요.
각 문단은 최소 3문장 이상으로 충분히 풍부하게 서술하세요.
대사는 문단 수에 포함하지 않습니다. 대사와 대사 사이에도 상황 묘사, 표정, 심리, 분위기 등을 지문으로 충분히 서술하세요.
${nl}문단보다 짧거나 길게 쓰지 마세요. 이 규칙은 절대적이며, 어떤 상황에서도 예외 없이 지켜야 합니다.
상태창, 시스템 표시 등은 문단 수에 포함하지 않습니다.`;
  }

  if (sr) prompt += `\n\n[시스템 규칙]\n${sr}`;
  if (w) prompt += `\n\n[세계관]\n${w}`;
  if (s) prompt += `\n\n[스토리]\n${s}`;
  if (ch) prompt += `\n\n[등장인물]\n${ch}`;
  if (cn || cs) {
    prompt += `\n\n[주인공]`;
    if (cn) prompt += `\n이름: ${cn}`;
    if (cs) prompt += `\n설정: ${cs}`;
  }
  if (un) prompt += `\n\n[유저노트]\n${un}`;

  if (options.useLatex) {
    prompt += `\n\n${LATEX_RULES}`;
  }

  if (cn) prompt = prompt.replaceAll('{{user}}', cn);

  return prompt;
}
