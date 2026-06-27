export const getGeminiApiKey = (): string | undefined => {
  const value = process.env.GEMINI_API_KEY;
  if (!value) {
    console.warn('GEMINI_API_KEY environment variable not set. AI features will fail.');
  }
  return value;
};
