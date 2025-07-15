import { DefaultSession, DefaultUser } from "next-auth";
import { AdapterUser } from "next-auth/adapters"; // AdapterUserをインポート
import { Role } from "@prisma/client";

// next-authモジュールの型定義を拡張
declare module "next-auth" {
  /**
   * `session.user`の型を拡張
   */
  interface User extends DefaultUser {
    id: string;
    role: Role;
    companyId?: string | null;
  }

  interface Session extends DefaultSession {
    user: User;
  }
}

// ★ 追加: next-auth/adaptersモジュールの型定義を拡張
declare module "next-auth/adapters" {
  /**
   * `session`コールバックに渡されるuserオブジェクトの型を拡張
   */
  interface AdapterUser extends DefaultUser {
    id: string;
    role: Role;
    companyId?: string | null;
  }
}
