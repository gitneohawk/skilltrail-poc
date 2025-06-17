export interface CandidateProfile {
  basicInfo: {
    fullName: string;
    age: number;
    gender: string;
    residence: string;
    address: {
      prefecture: string;
      city: string;
      postalCode: string;
    };
    contact: {
      email: string;
      phone: string;
    };
    workLocationPreferences: string[];
    remoteWorkPreference: {
      type: string;
      hybridDaysOnsite: number;
    };
  };
  careerPreferences: any;
  certifications: any[];
  experience: any;
  technicalSkills: any;
  languageSkills: any;
  softSkills: any[];
  mobilityFlexibility: any;
  privacySettings: {
    profileVisibility: string;
    allowScouting: boolean;
  };
}