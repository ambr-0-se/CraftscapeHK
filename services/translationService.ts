
import type { TranslationOption } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const getMahjongTranslationSuggestions = async (input: string): Promise<TranslationOption[]> => {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const response = await fetch(`${API_BASE_URL}/translation/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: trimmed }),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch translation suggestions from server.');
  }
  return await response.json();
};