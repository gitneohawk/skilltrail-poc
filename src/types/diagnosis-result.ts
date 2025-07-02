export interface LearningRoadmapStage {
  stage: number;
  title: string;
  skills: string[];
  actions: string[];
  resources: string[];
}

export interface DiagnosisResult {
  summary: string;
  strengths: string[];
  recommendations: string[];
  skillGapAnalysis?: string;
  learningPath?: string[]; // 旧プロパティ（後方互換用、不要なら削除可）
  learningRoadmap?: LearningRoadmapStage[];
  practicalSteps?: string[];
}
