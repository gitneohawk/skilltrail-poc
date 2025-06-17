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
      detail?: string;  // ここ追加
    };
    contact: {
      email: string;
      phone: string;
    };
    workLocationPreferences: string[];
    remoteWorkPreference: {
      type: "Onsite" | "Hybrid" | "Remote";
      hybridDaysOnsite: number;
    };
  };
  careerPreferences: {
    desiredJobTitles?: string[];
    otherDesiredJobTitle?: string;  // ここ追加
  };
  certifications?: string[];
  certificationsOther?: string;     // ここ追加
  experience: any;
  technicalSkills: any;
  languageSkills: any;
  softSkills: any;
  mobilityFlexibility: any;
  privacySettings: {
    profileVisibility: string;
    allowScouting: boolean;
  };
}