export interface DiagnosisResult {
  summary: string;
  strengths: string[];
  recommendations: string[];
  skillGapAnalysis?: string;
  learningPath?: string[];
  practicalSteps?: string[];
}
