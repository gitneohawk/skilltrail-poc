import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { BlobServiceClient } from '@azure/storage-blob';
import { streamToString } from '@/utils/stream';
import { saveTextToBlob, loadJsonFromBlobWithProvider } from '@/utils/azureBlob'; // loadJsonFromBlobWithProviderもインポート
import * as DiagnosisPrompt from '@/lib/diagnosis-prompt';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const detailsContainer = 'learning-plan-details';
const overviewContainer = 'learning-plans';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.sub) { return res.status(401).json({ error: 'Unauthorized' }); }

  const { stage } = req.query;
  const { provider, sub } = { provider: 'azure', sub: session.user.sub };
  if (typeof stage !== 'string') { return res.status(400).json({ error: 'Stage is required' }); }

  const blobName = `${sub}/${stage}.md`;
  const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
  const containerClient = blobServiceClient.getContainerClient(detailsContainer);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    // 1. まず、キャッシュ（Blob）が存在するか試す
    const downloadBlockBlobResponse = await blockBlobClient.download();
    const markdownContent = await streamToString(downloadBlockBlobResponse.readableStreamBody!);
    console.log(`ステージ${stage}のキャッシュを返します。`);
    return res.status(200).send(markdownContent);

  } catch (error: any) {
    if (error.statusCode === 404) {
      // 2. キャッシュがなければ、オンデマンドで生成する
      console.log(`ステージ${stage}のキャッシュがないため、オンデマンドで生成します。`);
      try {
        // 概要計画を読み込み、このステージの情報を取得
        const fullRoadmap = await loadJsonFromBlobWithProvider<any[]>(overviewContainer, provider, sub);
        const currentStep = fullRoadmap?.find(s => s.stage.toString() === stage);

        if (!currentStep) {
          return res.status(404).json({ error: 'Step not found in roadmap' });
        }

        // AIに詳細コンテンツをリクエスト
        const detailPrompt = DiagnosisPrompt.buildPromptForStageDetail(currentStep);
        const detailResponse = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [{ role: 'user', content: detailPrompt }],
        });
        const markdownContent = detailResponse.choices[0].message.content || 'コンテンツを生成できませんでした。';

        // 3. 生成したコンテンツをキャッシュとして保存
        await saveTextToBlob(detailsContainer, blobName, markdownContent);

        // 4. 生成したコンテンツをクライアントに返す
        return res.status(200).send(markdownContent);

      } catch (generationError) {
        console.error(`ステージ${stage}のオンデマンド生成に失敗:`, generationError);
        return res.status(500).json({ error: 'Failed to generate detail content' });
      }
    }
    // その他のBlobエラー
    console.error(`Blobへのアクセスエラー:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
