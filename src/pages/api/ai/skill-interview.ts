import 'node-fetch';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getDefaultProvider, loadSkillChatFromBlob, saveSkillChatToBlob, downloadJsonFromBlob } from '@/utils/azureBlob';
import type { SkillInterviewBlob } from '@/types/SkillInterviewBlob';
import { callOpenAIWithSkillInterviewPrompt } from '@/lib/openai';
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
    return res.status(200).json({ error: 'no_profile' });
  }
  const profileText = JSON.stringify(profileBlob, null, 2);

  const userId = session.user.sub;
  const provider = getDefaultProvider(session);
  
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

  const message = req.body.message ?? req.body.entry?.message;
  console.log('[skill-interview] received body:', req.body);

  if (typeof message !== 'string') {
    console.warn('[skill-interview] Invalid message format:', message);
    return res.status(400).json({ error: 'Invalid request format' });
  }

  try {
    const timestamp = new Date().toISOString();
    let entries: any[] = [];
    let existing: SkillInterviewBlob | null = null;
    try {
      existing = await loadSkillChatFromBlob(CHAT_CONTAINER, provider, userId) as SkillInterviewBlob | null;
      entries = Array.isArray(existing?.entries) ? existing.entries : [];
    } catch (_) {
      console.warn('[skill-interview] Blob not found or invalid, starting new session.');
    }

    const lastId = entries.length > 0 ? entries[entries.length - 1].id : 0;
    entries.push({ id: lastId + 1, role: 'user', message, timestamp });

    const profile: CandidateProfile = profileBlob as CandidateProfile;
    const reply = await callOpenAIWithSkillInterviewPrompt(profile, entries);
    entries.push({ id: lastId + 2, role: 'assistant', message: reply, timestamp });

    console.log('[skill-interview] saving to blob:', provider, userId, entries.length);
    await saveSkillChatToBlob(CHAT_CONTAINER, provider, userId, { entries });
    console.log('[skill-interview] saved successfully.');

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('[skill-interview] Failed to handle request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}