const MODEL_PRICING = {
  // per 1M tokens [input, output] — https://ai.google.dev/gemini-api/docs/pricing
  // Gemini 3.x
  'gemini-3.1-pro':        [2.00, 12.00],
  'gemini-3.1-flash-lite': [0.25, 1.50],
  'gemini-3-flash':        [0.50, 3.00],
  // Gemini 2.5
  'gemini-2.5-pro':        [1.25, 10.00],
  'gemini-2.5-flash-lite': [0.10, 0.40],
  'gemini-2.5-flash':      [0.30, 2.50],
  // Gemini 2.0
  'gemini-2.0-flash-lite': [0.075, 0.30],
  'gemini-2.0-flash':      [0.10, 0.40],
  // Legacy
  'gemini-1.5-pro':        [1.25, 5.00],
  'gemini-1.5-flash-8b':   [0.0375, 0.15],
  'gemini-1.5-flash':      [0.075, 0.30],
};

let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalCost = 0;

function getModelPricing(modelId) {
  for (const key of Object.keys(MODEL_PRICING)) {
    if (modelId.startsWith(key)) return MODEL_PRICING[key];
  }
  return null;
}

export function updateTokenDisplay(usageMetadata, modelId, tokenInfoEl, costInfoEl) {
  if (!usageMetadata) return;
  const promptTokens = usageMetadata.promptTokenCount || 0;
  const candidateTokens = usageMetadata.candidatesTokenCount || 0;

  totalInputTokens += promptTokens;
  totalOutputTokens += candidateTokens;

  const pricing = getModelPricing(modelId);
  if (pricing) {
    totalCost += (promptTokens / 1_000_000) * pricing[0]
               + (candidateTokens / 1_000_000) * pricing[1];
  }

  const totalTokens = totalInputTokens + totalOutputTokens;
  tokenInfoEl.textContent = `토큰: ${totalTokens.toLocaleString()} (↑${totalInputTokens.toLocaleString()} ↓${totalOutputTokens.toLocaleString()})`;
  costInfoEl.textContent = pricing
    ? `$${totalCost.toFixed(6)}`
    : `$-.-- (가격 정보 없음)`;
}

export function resetTokens(tokenInfoEl, costInfoEl) {
  totalInputTokens = 0;
  totalOutputTokens = 0;
  totalCost = 0;
  tokenInfoEl.textContent = '토큰: 0';
  costInfoEl.textContent = '$0.000000';
}
