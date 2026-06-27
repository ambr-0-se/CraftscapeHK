export type TranslationStrategy = 'phonetic' | 'meaning' | 'mixed';

export interface TranslationOption {
  id: string;
  chinese: string;
  pronunciation: string;
  explanation: string;
  strategy: TranslationStrategy;
}
