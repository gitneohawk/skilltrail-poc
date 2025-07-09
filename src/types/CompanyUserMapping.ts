export type CompanyUserMapping = {
  companyId: string; // 企業ID
  userId: string; // 担当者のMicrosoft ID
  role: 'admin' | 'editor' | 'viewer'; // 担当者の役割
  assignedDate: string; // ISO8601で割り当て日
};
