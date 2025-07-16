// pages/api/companies/gbiz-search.ts

import { NextApiRequest, NextApiResponse } from 'next';

// gBizINFOのAPI情報を環境変数から取得
const GBIZ_API_KEY = process.env.GBIZ_API_KEY;
const GBIZ_API_URL = 'https://info.gbiz.go.jp/hojin/v1/hojin';

// gBizINFOのレスポンスの型定義（主要なもののみ）
interface HojinInfo {
  corporate_number: string;
  name: string;
  name_en?: string;
  trade_name?: string;
  postal_code?: string;
  location?: string;
  city_name?: string;
  street_number?: string;
  address_outside?: string;
  corporate_url?: string;
  business_summary?: string;
  business_activities?: {
    code: string;
    code_name: string;
    value: string;
  }[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { companyName } = req.body;

  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required' });
  }

  if (!GBIZ_API_KEY) {
    console.error('gBizINFO API key is not set.');
    return res.status(500).json({ error: 'API key is not configured.' });
  }

  try {
    // gBizINFO APIへのリクエストURLを作成
    const searchUrl = `${GBIZ_API_URL}?name=${encodeURIComponent(companyName)}`;

    const gbizResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-hojinInfo-api-token': GBIZ_API_KEY,
      },
    });

    if (!gbizResponse.ok) {
      const errorBody = await gbizResponse.text();
      console.error('gBizINFO API Error:', errorBody);
      throw new Error(`gBizINFO API request failed with status ${gbizResponse.status}`);
    }

    const responseData = await gbizResponse.json();

    const hojinInfos: HojinInfo[] = responseData['hojin-infos'];

    if (!hojinInfos || hojinInfos.length === 0) {
      return res.status(404).json({ error: 'Company not found in gBizINFO.' });
    }

    // 最初の検索結果を元に、フロントエンドで利用しやすい形式にマッピング
    const firstResult = hojinInfos[0];
    const mappedResult = {
      corporateNumber: firstResult.corporate_number, // 法人番号を追加
      name: firstResult.name,
      website: firstResult.corporate_url || null,
      description: firstResult.business_summary || null,
      industry: firstResult.business_activities?.[0]?.value || null,
      headquarters: {
        postalCode: firstResult.postal_code || null,
        address: firstResult.location || null,
      },
    };

    res.status(200).json(mappedResult);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch company information' });
  }
}
