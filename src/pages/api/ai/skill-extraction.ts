import { NextApiRequest, NextApiResponse } from 'next';
import { callOpenAIWithSkillExtractionPrompt } from '@/utils/ai/skillExtraction';
import { SkillInterviewBlob, StructuredSkillsBlob, SkillSet } from '@/types/SkillInterviewBlob';
import { saveJsonToBlobWithProvider, loadJsonFromBlobWithProvider } from '@/utils/azureBlob';
import { CandidateProfile } from '@/types/CandidateProfile';

const CONTAINER_NAME = 'career-profiles';

// 新: ユーザーの各エントリごとにスキル抽出・マージ
async function extractSkillsIncrementally(profile: CandidateProfile, entries: SkillInterviewBlob['entries']): Promise<SkillSet[]> {
  let skillProfile: SkillSet[] = [];
  const seenSkillNames = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const contextEntries = entries.slice(0, i + 1); // 直近までの会話履歴
    // ユーザー発言のみをトリガーにする
    if (entries[i].role !== 'user') continue;
    try {
      const extracted: StructuredSkillsBlob = await callOpenAIWithSkillExtractionPrompt({ profile, entries: contextEntries });
      for (const skill of extracted.skills) {
        // 重複排除: skillName+level+categoryでユニーク化、より新しいものを優先
        const key = `${skill.skillName}|${skill.level||''}|${skill.category||''}`;
        if (!seenSkillNames.has(key)) {
          skillProfile = skillProfile.filter(s => s.skillName !== skill.skillName); // 古い同名スキルを除外
          skillProfile.push(skill);
          seenSkillNames.add(key);
        }
      }
    } catch (err) {
      // ログは残すが処理は継続
      console.warn(`[SkillExtraction] entry ${i} failed:`, err);
    }
  }
  return skillProfile;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, provider, blob, profile: profileFromClient } = req.body as { userId: string; provider: string; blob: SkillInterviewBlob; profile?: CandidateProfile };

  if (!userId || !provider || !blob) {
    return res.status(400).json({ error: 'Missing userId, provider, or blob' });
  }

  try {
    let profile = profileFromClient;
    if (!profile) {
      const loaded = await loadJsonFromBlobWithProvider<CandidateProfile>(CONTAINER_NAME, provider, userId);
      if (!loaded) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      profile = loaded as CandidateProfile;
    }

    // 新: 各エントリごとにスキル抽出・マージ
    const mergedSkills = await extractSkillsIncrementally(profile, blob.entries);
    profile.technicalSkills = mergedSkills;
    await saveJsonToBlobWithProvider(CONTAINER_NAME, provider, userId, profile);

    return res.status(200).json({ success: true, extractedSkills: mergedSkills });
  } catch (error) {
    console.error('[SkillExtraction API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Bonus: スキル可視化ヘルパー
export function visualizeSkillsWithSources(skills: SkillSet[], entries: SkillInterviewBlob['entries']) {
  return skills.map(skill => {
    // スキル名が含まれるユーザーメッセージIDを列挙
    const sourceIds = entries.filter(e => e.role === 'user' && e.message.includes(skill.skillName)).map(e => e.id);
    return { ...skill, sourceIds };
  });
}