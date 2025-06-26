export interface CandidateProfile {
  basicInfo: {
    fullName: string;
    age: number;
    gender: string;
    address: {
      prefecture: string;
      city: string;
      postalCode: string;
      detail: string;
    };
    contact: {
      email: string;
      phone: string;
    };
    workLocationPreferences: string[];
    remoteWorkPreference: {
      type: 'Remote' | 'Hybrid' | 'Onsite';
      hybridDaysOnsite: number;
    };
  };
  careerPreferences: {
    desiredJobTitles: string[];
    otherDesiredJobTitle: string;
    hybridPreference: {
      mode: string;
      onSiteDays: number;
    };
    preferredStartTime: string;
  };
  certifications: string[];
  certificationsOther: string;
  experience: any;
  technicalSkills: any;
  languageSkills: any;
  softSkills: string[];
  mobilityFlexibility: any;
  privacySettings: {
    profileVisibility: 'Private' | 'Public';
    allowScouting: boolean;
  },
  careerSummary: string;
  skills: string[];
}