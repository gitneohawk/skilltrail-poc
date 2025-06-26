export interface SkillInterviewBlob {
  entries: SkillInterviewMessage[];
}

export type SkillInterviewMessage = {
  id: number;
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
};

export interface SkillSet {
  skillName: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  experienceYears?: number;
  category?: string;
  confirmed?: boolean;
  isCustom?: boolean;
}

export interface StructuredSkillsBlob {
  skills: SkillSet[];
  extractedFrom: string;
  createdAt: string;
}
