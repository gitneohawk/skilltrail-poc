export type CompanyProfile = {
  id: string; // APIから返されるID
  name: string; // companyNameから変更
  industry: string;
  description: string; // companyDescriptionから変更
  tagline?: string;
  headquarters: {
    country: string;
    region: string;
    city: string;
  };
  locations: {
    country: string;
    region: string;
    city: string;
  }[];
  companySize?: string;
  companyType?: string;
  yearFounded?: number;
  website?: string;
  logoUrl?: string;
  mission?: string;
  cultureAndValues?: string;
  techStack?: string[];
  employeeBenefits?: string[];
  gallery?: any;
  securityTeamSize?: string;
  hasCiso?: boolean;
  hasCsirt?: boolean;
  isCsirtMember?: boolean;
  securityCertifications?: string[];
  securityAreas?: string[];
  conferenceParticipation?: string;
  certificationSupport?: boolean;
  internalContacts: {
    primaryContactName: string;
    primaryContactEmail: string;
    primaryContactPhone: string;
  };
};
