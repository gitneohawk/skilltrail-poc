// pages/api/companies/gbiz-fetch-details.ts

import { NextApiRequest, NextApiResponse } from 'next';

const GBIZ_API_KEY = process.env.GBIZ_API_KEY;
const GBIZ_API_URL = 'https://info.gbiz.go.jp/hojin/v1/hojin';

// gBizINFOからの詳細情報の型定義
interface HojinDetail {
  corporate_number?: string;
  name?: string;
  date_of_establishment?: string; // 設立年月日
  employee_number?: number;
  capital_stock?: number;
  location?: string;
  company_url?: string; // 公式サイトURL
  business_summary?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { corporateNumber } = req.body;

  if (!corporateNumber || !GBIZ_API_KEY) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const detailUrl = `${GBIZ_API_URL}/${corporateNumber}`;
    const gbizResponse = await fetch(detailUrl, {
      method: 'GET',
      headers: { 'X-hojinInfo-api-token': GBIZ_API_KEY },
    });

    if (!gbizResponse.ok) {
      throw new Error(`gBizINFO detail API request failed with status ${gbizResponse.status}`);
    }

    const responseData = await gbizResponse.json();
    const detailInfo: HojinDetail = (responseData['hojin-infos'] || [])[0];

    if (!detailInfo) {
      return res.status(404).json({ error: 'Company details not found.' });
    }

    // ▼▼▼ 法人種別のマッピングを削除 ▼▼▼
    const mappedResult = {
      corporateNumber: detailInfo.corporate_number,
      name: detailInfo.name,
      // corporateType: ... の行を削除
      yearFounded: detailInfo.date_of_establishment ? new Date(detailInfo.date_of_establishment).getFullYear() : null,
      companySize: detailInfo.employee_number ? detailInfo.employee_number.toString() : null,
      capitalStock: detailInfo.capital_stock,
      headquarters: detailInfo.location,
      website: detailInfo.company_url,
      description: detailInfo.business_summary,
      industry: null,
    };

    res.status(200).json(mappedResult);

  } catch (error) {
    console.error('Error fetching company details:', error);
    res.status(500).json({ error: 'Failed to fetch company details' });
  }
}
