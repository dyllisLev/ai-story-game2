import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PromptConfig, GameplayConfig } from '@story-game/shared';

export type { PromptConfig, GameplayConfig };

export interface AdminConfig {
  prompt_config: PromptConfig;
  gameplay_config: GameplayConfig;
}

/* ── Defaults ── */

const DEFAULT_PROMPT: PromptConfig = {
  system_preamble:
    '당신은 인터랙티브 소설 게임의 AI 스토리텔러입니다.\n아래 설정을 기반으로 몰입감 있는 소설을 진행하세요.\n\n사용자가 행동을 입력하면 그에 따라 이야기를 이어가세요.\n각 응답은 소설체로 작성하세요.',
  latex_rules:
    '[LaTeX 서식 규칙]\n- 상태 수치는 \\boxed{값} 형식으로 표기\n- 내공 수준은 \\text{단계} 형식\n- 전투 판정은 \\frac{공격}{방어} 형식\n- 특수 기술명은 \\mathbf{기술명} 형식으로 강조\n- 일반 대화 및 서술에는 LaTeX를 사용하지 않음',
  narrative_length_template:
    '[!!! 서술 분량 규칙 - 최우선 필수 준수 !!!]\n반드시 매 응답마다 지문/묘사 문단을 정확히 {nl}문단으로 작성하세요.\n짧거나 길면 안 됩니다. 정확히 {nl}문단입니다.\n각 문단은 2~4문장으로 구성하세요.',
  game_start_message: '게임을 시작해줘',
  memory_system_instruction:
    '당신은 인터랙티브 소설의 핵심 사건을 추출하는 요약 전문가입니다.\n주어진 대화 히스토리에서 이야기 진행에 중요한 정보만 압축하여 요약하세요.\n인물 관계, 상태 변화, 획득 아이템/스킬, 주요 선택 결과를 포함하세요.',
  memory_request:
    '다음 대화 히스토리에서 핵심 사건, 인물 관계, 상태 변화를 추출하여 500자 이내로 요약하세요.\n\n[히스토리]\n{history}',
  safety_settings: [],
  cache_ttl: '3600s',
};

const DEFAULT_GAMEPLAY: GameplayConfig = {
  default_narrative_length: 3,
  narrative_length_min: 1,
  narrative_length_max: 10,
  sliding_window_size: 20,
  max_history: 20,
  message_limit: 500,
  message_warning_threshold: 300,
  memory_short_term_max: 10,
  auto_save_interval_ms: 300000,
  max_session_list: 50,
};

/* ── Hook ── */

export function useAdminConfig() {
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { data: config, isLoading, error } = useQuery<AdminConfig>({
    queryKey: ['admin', 'config'],
    queryFn: async () => {
      const raw = await api.get<{ prompt_config?: unknown; gameplay_config?: unknown }>('/config');
      return {
        prompt_config: {
          ...DEFAULT_PROMPT,
          ...(raw.prompt_config as Partial<PromptConfig> ?? {}),
        },
        gameplay_config: {
          ...DEFAULT_GAMEPLAY,
          ...(raw.gameplay_config as Partial<GameplayConfig> ?? {}),
        },
      };
    },
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (next: AdminConfig) => api.put('/config', next),
    onMutate: () => setSaveStatus('saving'),
    onSuccess: () => {
      setSaveStatus('saved');
      setLastSaved(new Date());
      void queryClient.invalidateQueries({ queryKey: ['admin', 'config'] });
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    },
  });

  const save = useCallback(
    (next: AdminConfig) => mutation.mutate(next),
    [mutation],
  );

  return {
    config: config ?? { prompt_config: DEFAULT_PROMPT, gameplay_config: DEFAULT_GAMEPLAY },
    isLoading,
    error,
    save,
    saveStatus,
    lastSaved,
  };
}
