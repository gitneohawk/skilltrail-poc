// types/CompanyProfile.ts

// 担当者情報の型定義
export type ContactProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

// 企業プロフィールの型定義
export type CompanyProfile = {
  // --- データベースの主キーや自動生成されるフィールド ---
  corporateNumber: string;
  id?: string; // Prismaが内部的に使用する可能性のあるID
  createdAt?: string;
  updatedAt?: string;

  // --- ユーザーが定義したフィールド ---
  name: string;
  industry: string | null;
  description: string | null;
  tagline?: string | null;

  // ▼▼▼ 型を string | null に修正 ▼▼▼
  // gBizINFOからは文字列として提供されるため、オブジェクトではなく文字列で受け取る
  headquarters: string | null;

  // ▼▼▼ capitalStock を追加 ▼▼▼
  // APIからは文字列として渡される
  capitalStock: string | null;

  locations?: any; // Json型はanyで受けるのが簡単
  companySize?: string | null;
  companyType?: string | null;
  yearFounded?: number | null;
  website?: string | null;
  logoUrl?: string | null;
  headerImageUrl?: string | null;
  headerImageOffsetY?: number | null; // ヘッダー画像のオフセット位置
  mission?: string | null;
  cultureAndValues?: string | null;
  techStack?: string[];
  employeeBenefits?: string[];
  gallery?: any;
  securityTeamSize?: string | null;
  hasCiso?: boolean | null;
  hasCsirt?: boolean | null;
  isCsirtMember?: boolean | null;
  securityCertifications?: string[];
  securityAreas?: string[];
  conferenceParticipation?: string | null;
  certificationSupport?: boolean | null;
  contact: ContactProfile | null;
};
