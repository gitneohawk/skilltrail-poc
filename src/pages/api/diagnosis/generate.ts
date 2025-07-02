import type { NextApiRequest, NextApiResponse } from 'next';
import { CandidateProfile } from '@/types/CandidateProfile';
import { DiagnosisResult } from '@/types/diagnosis-result';
import { buildPrompt } from '@/lib/diagnosis-prompt';
import { callOpenAIWithDiagnosisPrompt } from '@/lib/openai';
import { loadJsonFromBlobWithProvider } from '@/utils/azureBlob';

// const containerName = process.env.AZURE_BLOB_CONTAINER;
const containerName = 'career-profiles';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!containerName) {
    res.status(500).json({ error: 'Blob container name is not set in environment variables.' });
    return;
  }

  try {
    const { provider, sub } = req.body;
    if (!provider || !sub) {
      res.status(400).json({ error: 'Missing provider or sub' });
      return;
    }

    const profile = await loadJsonFromBlobWithProvider<CandidateProfile>(containerName, provider, sub);
    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    // buildPromptでプロンプトを生成し、callOpenAIWithDiagnosisPromptに渡す
    const prompt = buildPrompt(profile);
    // callOpenAIWithDiagnosisPromptはprofileのみ渡す
    const diagnosis: DiagnosisResult = await callOpenAIWithDiagnosisPrompt(profile);

    res.status(200).json(diagnosis);
  } catch (error: any) {
    console.error('Diagnosis generation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}