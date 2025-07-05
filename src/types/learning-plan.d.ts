// 学習ロードマップの各ステップの型定義
export interface RoadmapStep {
  id: string; // マージ処理を正確に行うためのユニークID
  stage: number;
  title: string;
  skills: string[];
  actions: string[];
  resources: string[];
  status: 'todo' | 'in_progress' | 'completed';
}
