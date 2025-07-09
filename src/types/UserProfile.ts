export type UserProfile = {
  userId: string;
  name: string;
  email: string;
  // 他のユーザー情報...

  /**
   * 所属する企業のID。
   * どの企業にも所属していない場合は null になります。
   */
  companyId: string | null;

  /**
   * (任意) 企業内での役割。権限管理に便利です。
   */
  companyRole?: 'admin' | 'member';
};
