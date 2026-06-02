export interface Sentence {
  en: string;
  uz: string;
}

export interface Question {
  id: number;
  word: string;
  definition: string;
  sentence: Sentence;
  options: string[];
  correct_option_index: number;
}

export interface ShuffledOption {
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion extends Question {
  shuffledOptions: ShuffledOption[];
}

export interface WrongAnswer {
  word: string;
  definition: string;
  sentence: Sentence;
  correctAnswer: string;
  userAnswer: string;
}