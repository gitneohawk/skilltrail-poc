import { CandidateProfile } from '@/types/CandidateProfile';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'node:stream';
import { getDefaultProvider, loadJsonFromBlobWithProvider, saveJsonToBlobWithProvider } from '@/utils/azureBlob';

const containerName = 'career-profiles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const provider = getDefaultProvider(null); // Sessionは利用しないAPIのためnull
  const rawSub = req.query.sub as string;
  const sub = decodeURIComponent(rawSub);
  if (!provider || typeof provider !== 'string' || !sub || typeof sub !== 'string') {
    res.status(400).json({ error: 'Invalid provider or sub parameter' });
    return;
  }

  try {
    if (req.method === 'GET') {
      // containerNameを追加
      const profile = await loadJsonFromBlobWithProvider(containerName, provider, sub);
      res.status(200).json(profile);
    } else if (req.method === 'POST') {
      const profile: CandidateProfile = {
        basicInfo: {
          fullName: req.body.basicInfo?.fullName || '',
          age: req.body.basicInfo?.age || 20,
          gender: req.body.basicInfo?.gender || '',
          address: {
            prefecture: req.body.basicInfo?.address?.prefecture || '',
            city: req.body.basicInfo?.address?.city || '',
            postalCode: req.body.basicInfo?.address?.postalCode || '',
            detail: req.body.basicInfo?.address?.detail || '',
          },
          contact: {
            email: req.body.basicInfo?.contact?.email || '',
            phone: req.body.basicInfo?.contact?.phone || '',
          },
          workLocationPreferences: req.body.basicInfo?.workLocationPreferences || [],
          remoteWorkPreference: {
            type: req.body.basicInfo?.remoteWorkPreference?.type || 'Onsite',
            hybridDaysOnsite: req.body.basicInfo?.remoteWorkPreference?.hybridDaysOnsite || 0,
          }
        },
        careerPreferences: {
          desiredJobTitles: req.body.careerPreferences?.desiredJobTitles || [],
          otherDesiredJobTitle: req.body.careerPreferences?.otherDesiredJobTitle || '',
          hybridPreference: {
            mode: req.body.careerPreferences?.hybridPreference?.mode || 'Onsite',
            onSiteDays: req.body.careerPreferences?.hybridPreference?.onSiteDays || 0
          },
          preferredStartTime: req.body.careerPreferences?.preferredStartTime || ''
        },
        certifications: req.body.certifications || [],
        certificationsOther: req.body.certificationsOther || '',
        experience: req.body.experience || {},
        technicalSkills: req.body.technicalSkills || {},
        languageSkills: req.body.languageSkills || {},
        softSkills: req.body.softSkills || [],
        mobilityFlexibility: req.body.mobilityFlexibility || {},
        careerSummary: req.body.careerSummary || '',
        skills: req.body.skills || [],
        privacySettings: req.body.privacySettings || {
          profileVisibility: 'Public',
          allowScouting: true
        }
      };

      // containerNameを追加
      await saveJsonToBlobWithProvider(containerName, provider, sub, profile);
      res.status(200).json({ message: 'Profile saved successfully.' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    if (error.statusCode === 404) {
      res.status(404).json({ error: 'Profile not found for given ID.' });
    } else {
      console.error('Error accessing blob storage:', error);
      res.status(500).json({ error: 'Blob storage operation failed.' });
    }
  }
}