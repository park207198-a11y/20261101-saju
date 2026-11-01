export interface ScoredSection {
  score: number;
  detail: string;
}

export interface Reading {
  summary: string;
  personality: ScoredSection & { title: string };
  overall: ScoredSection;
  wealth: ScoredSection;
  love: ScoredSection;
  business: ScoredSection;
  career: ScoredSection;
  health: ScoredSection;
  relationships: ScoredSection;
  currentYear: ScoredSection & { year: number };
  monthly: { month: number; score: number; note: string }[];
  daeun: { ageRange: string; theme: string; detail: string }[];
  luckyItems: { color: string; direction: string; number: string; element: string };
  advice: string;
}
