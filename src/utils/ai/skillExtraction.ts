import { callOpenAIWithSkillExtractionPrompt as callOpenAIWithSkillExtractionPromptRaw } from '@/lib/openai';
import { SkillInterviewBlob, StructuredSkillsBlob, SkillSet } from '@/types/SkillInterviewBlob';
import { SKILL_CANDIDATES } from '@/types/Skills';

export async function callOpenAIWithSkillExtractionPrompt(
  params: { profile: any; entries: any[] }
): Promise<StructuredSkillsBlob> {
  const { profile, entries } = params;

  // プロンプト生成はlib/openai.ts側で行う設計なので、ここではprofileとentriesを渡すだけでOK
  const raw = await callOpenAIWithSkillExtractionPromptRaw(profile, entries.map(e => ({
    role: e.role,
    message: e.message
  })));

  let skills: SkillSet[] = [];
  try {
    skills = JSON.parse(raw);
  } catch (err) {
    // JSONでなければエラー内容をthrow
    throw new Error('AIから構造化スキル情報が返りませんでした。AIの返答: ' + raw);
  }

  return {
    skills,
    extractedFrom: 'skill-chat',
    createdAt: new Date().toISOString()
  };
}

/**
 * AI抽出スキル名をSKILL_CANDIDATESとマッチング（完全一致→部分一致）。
 * マッチしない場合はotherSkillsに分類。
 */
export function matchSkillsToCandidates(aiSkills: { skillName: string }[]): { matched: string[]; otherSkills: string[] } {
  const candidates = SKILL_CANDIDATES;
  const matched: string[] = [];
  const otherSkills: string[] = [];
  aiSkills.forEach(({ skillName }) => {
    if (!skillName) return;
    // 完全一致
    const exact = candidates.find((c) => c.toLowerCase() === skillName.toLowerCase());
    if (exact) {
      matched.push(exact);
      return;
    }
    // 部分一致
    const partial = candidates.find((c) => skillName.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(skillName.toLowerCase()));
    if (partial) {
      matched.push(partial);
      return;
    }
    // どちらにも該当しない
    otherSkills.push(skillName);
  });
  return { matched, otherSkills };
}