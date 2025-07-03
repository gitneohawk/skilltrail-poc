import 'node-fetch';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getDefaultProvider, loadSkillChatFromBlob, saveSkillChatToBlob, downloadJsonFromBlob } from '@/utils/azureBlob';
import { matchSkillsToCandidates } from '@/utils/ai/skillExtraction';
import type { SkillInterviewBlob } from '@/types/SkillInterviewBlob';
import { callOpenAIWithSkillInterviewPrompt, callOpenAIWithSkillExtractionPrompt, callOpenAIWithSkillStructuringAndNextQuestion } from '@/lib/openai';
import type { CandidateProfile } from '@/types/CandidateProfile';

const PROFILE_CONTAINER = 'career-profiles';
const CHAT_CONTAINER = 'skill-interviews';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user || typeof session.user.sub !== 'string') {
    console.error('[skill-interview] Invalid session:', session);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const profileBlob = await downloadJsonFromBlob(PROFILE_CONTAINER, session);
  if (!profileBlob) {
    return res.status(400).json({ error: 'CandidateProfile not found' });
  }
  const profile: CandidateProfile = profileBlob as CandidateProfile;
  // 必須フィールドの存在チェック
  if (
    typeof profile.basicInfo?.age === 'undefined' ||
    !Array.isArray(profile.certifications) ||
    !Array.isArray(profile.careerPreferences?.desiredJobTitles)
  ) {
    return res.status(400).json({ error: 'CandidateProfile is missing required fields' });
  }

  const userId = session.user.sub;
  const provider = 'azure'; // getDefaultProviderを削除し、固定値に変更

  if (req.body?.loadHistory) {
    try {
      const existing = await loadSkillChatFromBlob(CHAT_CONTAINER, provider, userId) as SkillInterviewBlob | null;
      return res.status(200).json(existing ?? { entries: [] });
    } catch (error) {
      console.warn('[skill-interview] Failed to load previous session:', error);
      return res.status(200).json({ entries: [] });
    }
  }

  if (req.body?.append && Array.isArray(req.body.messages)) {
    try {
      const timestamp = new Date().toISOString();
      const existing = await loadSkillChatFromBlob(CHAT_CONTAINER, provider, userId) as SkillInterviewBlob | null;
      const entries = Array.isArray(existing?.entries) ? existing.entries : [];
      const newEntries = req.body.messages.map((msg: any, idx: number) => ({
        id: entries.length + idx + 1,
        role: msg.role,
        message: msg.content,
        timestamp,
      }));
      entries.push(...newEntries);
      await saveSkillChatToBlob(CHAT_CONTAINER, provider, userId, { entries });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[skill-interview] Failed to append messages to blob:', error);
      return res.status(500).json({ error: 'Failed to append messages' });
    }
  }

  // --- 新方式: クライアントからentries, profileが来ていればそれを使う ---
  const entriesFromClient = Array.isArray(req.body.entries) ? req.body.entries : undefined;
  const profileFromClient = req.body.profile ? req.body.profile : undefined;
  const userEntry = req.body.entry;

  // messageは従来互換のため残すが、今後はentry/entries/profileを推奨
  const message = req.body.message ?? userEntry?.message;
  if (!userEntry && typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  try {
    const timestamp = new Date().toISOString();
    let entries: any[] = [];
    let profileToUse: CandidateProfile = profile;
    if (entriesFromClient) {
      entries = entriesFromClient;
    } else {
      // fallback: blobから取得
      let existing: SkillInterviewBlob | null = null;
      try {
        existing = await loadSkillChatFromBlob(CHAT_CONTAINER, provider, userId) as SkillInterviewBlob | null;
        entries = Array.isArray(existing?.entries) ? existing.entries : [];
      } catch (_) {
        console.warn('[skill-interview] Blob not found or invalid, starting new session.');
      }
      if (typeof message === 'string') {
        const lastId = entries.length > 0 ? entries[entries.length - 1].id : 0;
        entries.push({ id: lastId + 1, role: 'user', message, timestamp });
      }
    }
    if (profileFromClient) {
      profileToUse = profileFromClient;
    }

    // --- 新方式: スキル構造化＋次の質問生成を1リクエストで ---
    const { skills, nextQuestion } = await callOpenAIWithSkillStructuringAndNextQuestion(profileToUse, entries);

    // スキル名マッチング
    const { matched, otherSkills } = matchSkillsToCandidates(skills || []);

    // profileに書き戻し
    const updatedProfile = { ...profileToUse, skills: matched, otherSkills };
    const { uploadJsonToBlob } = require('@/utils/azureBlob');
    await uploadJsonToBlob(PROFILE_CONTAINER, session, updatedProfile);

    // entriesにAIの質問を追加して保存
    const lastId = entries.length > 0 ? entries[entries.length - 1].id : 0;
    entries.push({ id: lastId + 1, role: 'assistant', message: nextQuestion, timestamp });
    await saveSkillChatToBlob(CHAT_CONTAINER, provider, userId, { entries });

    return res.status(200).json({ nextQuestion, structuredSkills: skills, matchedSkills: matched, otherSkills });
  } catch (error) {
    console.error('[skill-interview] Failed to handle request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
