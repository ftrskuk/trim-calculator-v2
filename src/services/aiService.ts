import type { AiSuggestionResponse, CalculatorState } from '../types/calculator';

const DEFAULT_ERROR = 'AI suggestion failed. Please try again later.';

export async function requestAiSuggestion(state: CalculatorState): Promise<AiSuggestionResponse> {
  const endpoint = import.meta.env.VITE_AI_ENDPOINT as string | undefined;
  if (!endpoint) {
    throw new Error('AI endpoint is not configured. Set VITE_AI_ENDPOINT to your backend proxy.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: buildPrompt(state)
    })
  });

  if (!response.ok) {
    throw new Error(DEFAULT_ERROR);
  }

  const payload = (await response.json()) as AiSuggestionResponse;
  if (!payload?.sets) {
    throw new Error('Invalid AI response payload.');
  }
  return payload;
}

function buildPrompt(state: CalculatorState): string {
  const millSummary = state.millId ? `Selected mill id: ${state.millId}` : 'No mill selected';
  const rows = state.rows
    .map((row) => `- ${row.label || 'Unnamed'}: width=${row.width || 0}mm, required rolls=${row.requiredRolls || 0}`)
    .join('\n');
  const sets = state.sets
    .map((set) => `- ${set.label}: multiplier=${set.multiplier || 0}`)
    .join('\n');

  return `You are GPT-5 Codex helping with paper trim optimization.\n${millSummary}\nSubstance: ${state.substance || 0} gsm\nRoll length: ${state.length || 0} m\nWidths:\n${rows}\nSets:\n${sets}\nReturn optimized sets as JSON matching schema {"sets":[{"multiplier":number,"rows":[{"label":string,"width":number,"rolls":number}]}]}. Ensure multipliers are non-negative integers and widths align with provided rows.`;
}
