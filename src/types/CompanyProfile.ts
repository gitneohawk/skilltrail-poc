export type CompanyProfile = {
  companyId: string;
  companyName: string;
  industry: string;
  companyDescription: string;
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
  companySize: string;
  website: string;
  logoUrl: string;
  registeredDate: string; // ISO8601
  internalContacts: {
    primaryContactName: string;
    primaryContactEmail: string;
    primaryContactPhone: string;
  };
};