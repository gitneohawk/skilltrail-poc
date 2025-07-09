// pages/api/company/gbiz-search.ts

import { NextApiRequest, NextApiResponse } from 'next';

// gBizINFOのAPI情報を環境変数から取得
const GBIZ_API_KEY = process.env.GBIZ_API_KEY;
const GBIZ_API_URL = 'https://info.gbiz.go.jp/hojin/v1/hojin';

// gBizINFOのレスポンスの型定義（主要なもののみ）
interface HojinInfo {
  corporate_number: string;
  name: string;
  location?: string;
  corporate_url?: string;
  business_summary?: string;
  business_activities?: { value: string }[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { companyName } = req.body;

  if (!companyName || !GBIZ_API_KEY) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const searchUrl = `${GBIZ_API_URL}?name=${encodeURIComponent(companyName)}`;
    const gbizResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-hojinInfo-api-token': GBIZ_API_KEY,
      },
    });

    if (gbizResponse.status === 404) {
      return res.status(200).json([]); // 見つからない場合は空の配列を返す
    }
    if (!gbizResponse.ok) {
        throw new Error(`gBizINFO API request failed with status ${gbizResponse.status}`);
    }

    const responseData = await gbizResponse.json();
    const hojinInfos: HojinInfo[] = responseData['hojin-infos'] || [];

    // ▼▼▼ ここを修正 ▼▼▼
    // hojin-infos配列の全ての要素を処理し、新しい配列を作成する
    const results = hojinInfos.map(info => ({
      corporateNumber: info.corporate_number,
      name: info.name,
      location: info.location || '住所情報なし',
      website: info.corporate_url || null,
      description: info.business_summary || null,
      industry: info.business_activities?.[0]?.value || null,
    }));

    // 結果の配列をフロントエンドに返す
    res.status(200).json(results);

  } catch (error) {
    console.error('Error in handler:', error);
    res.status(500).json({ error: 'Failed to fetch company information' });
  }
}
