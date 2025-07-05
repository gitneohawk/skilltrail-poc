import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { loadJsonFromBlobWithProvider, saveJsonToBlobWithProvider } from '@/utils/azureBlob';

// 型定義を明確にしておくと、コードが安全になります
interface RoadmapStep {
  stage: number;
  title: string;
  skills: string[];
  actions: string[];
  resources: string[];
  status: 'todo' | 'in_progress' | 'completed';
}

const learningPlanContainerName = 'learning-plans';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  // ユーザーが認証されていない場合はエラーを返す
  if (!session?.user?.sub) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const provider = 'azure'; // 今はazureに固定
  const sub = session.user.sub;

  switch (req.method) {
    // 学習計画を取得する (GET)
    case 'GET':
      try {
        const learningPlan = await loadJsonFromBlobWithProvider<RoadmapStep[]>(learningPlanContainerName, provider, sub);

        if (learningPlan) {
          res.status(200).json(learningPlan);
        } else {
          // 計画がまだ存在しない場合は404を返す
          res.status(404).json({ message: '学習計画が見つかりません。' });
        }
      } catch (error) {
        console.error('Error fetching learning plan:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
      break;

    // 学習計画の進捗を更新する (POST)
    case 'POST':
      try {
        const { stage, status } = req.body;

        // リクエストの内容が正しいかチェック
        if (typeof stage !== 'number' || !['todo', 'in_progress', 'completed'].includes(status)) {
          return res.status(400).json({ error: 'Invalid request body' });
        }

        // 現在の計画を読み込む
        const currentPlan = await loadJsonFromBlobWithProvider<RoadmapStep[]>(learningPlanContainerName, provider, sub);

        if (!currentPlan) {
          return res.status(404).json({ error: 'Learning plan not found to update.' });
        }

        // 該当するステップのstatusを更新
        const updatedPlan = currentPlan.map(step =>
          step.stage === stage ? { ...step, status: status } : step
        );

        // 更新した計画でBlobを上書き保存
        await saveJsonToBlobWithProvider(learningPlanContainerName, provider, sub, updatedPlan);

        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error updating learning plan:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
