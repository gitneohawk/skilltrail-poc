import { callOpenAIWithSkillExtractionPrompt as callOpenAIWithSkillExtractionPromptRaw } from '@/lib/openai';
import { SkillInterviewBlob, StructuredSkillsBlob, SkillSet } from '@/types/SkillInterviewBlob';
import { SKILL_CANDIDATES } from '@/types/Skills';

export async function callOpenAIWithSkillExtractionPrompt(
  blob: SkillInterviewBlob
): Promise<StructuredSkillsBlob> {
  const { entries} = blob; // profileText → profile へ修正

  const conversation = entries
    .map((e) => `${e.role === 'user' ? 'User' : 'Assistant'}: ${e.message}`)
    .join('\n');

  // プロンプト生成はlib/openai.ts側で行う設計なので、ここではprofileとentriesを渡すだけでOK
  const raw = await callOpenAIWithSkillExtractionPromptRaw(entries.map(e => ({
    role: e.role,
    message: e.message
  })));

  const skills: SkillSet[] = JSON.parse(raw);

  return {
    skills,
    extractedFrom: 'skill-chat',
    createdAt: new Date().toISOString()
  };
}