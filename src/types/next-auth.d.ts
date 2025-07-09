// next-auth.d.ts

import { Role } from "@prisma/client";
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { AdapterUser } from "next-auth/adapters";

// NextAuthの組み込み型を拡張
declare module "next-auth" {
  /**
   * `session`コールバックから返されるSessionオブジェクトの型。
   */
  interface Session {
    user: {
      id: string;
      role: Role; // データベースのRole Enum型
    } & DefaultSession["user"]; // デフォルトのプロパティ(name, email, image)を継承
  }

  /**
   * データベースから取得されるUserオブジェクトの型。
   */
  interface User extends DefaultUser {
    role: Role;
  }
}

// ▼▼▼ Adapterが使用するUserの型も拡張する ▼▼▼
declare module "next-auth/adapters" {
  /**
   * PrismaAdapterが内部的に使用するAdapterUser型にも
   * roleプロパティを追加します。
   */
  interface AdapterUser extends User {
    role: Role;
  }
}
