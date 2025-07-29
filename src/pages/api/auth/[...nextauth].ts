// src/pages/api/auth/[...nextauth].ts

import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import AzureADProvider from "next-auth/providers/azure-ad";
import EmailProvider from 'next-auth/providers/email'; // 1. EmailProviderをインポート
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { Adapter } from "next-auth/adapters";
import { NextApiRequest, NextApiResponse } from 'next';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: "common",
      allowDangerousEmailAccountLinking: true,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),

  ],
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,

  events: {
    // 新しいユーザーが作成された直後に、この処理が自動で実行される
    async createUser({ user }) {
      // もし、ユーザー名が設定されておらず(例: メール認証)、メールアドレスが存在する場合
      if (!user.name && user.email) {
        // メールの@より前の部分を、デフォルトのユーザー名として設定する
        const defaultName = user.email.split('@')[0];

        // データベースを更新して、デフォルト名を保存する
        await prisma.user.update({
          where: { id: user.id },
          data: { name: defaultName },
        });
      }
    }
  },

  // session: {
  //   strategy: 'jwt',
  //   // ★★★ 例えば、セッションの有効期限を30日に設定 ★★★
  //   maxAge: 30 * 24 * 60 * 60, // 30 days
  // },

  callbacks: {
    async signIn({ account }) {
      if (account && (account as any).ext_expires_in) {
        delete (account as any).ext_expires_in;
      }
      return true;
    },
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      session.user.companyId = user.companyId;
      return session;
    },
  },
};

export default (req: NextApiRequest, res: NextApiResponse) => {
  // Azure SWAが提供するヘッダーから、正しいホスト名を取得します。
  const host = req.headers['x-forwarded-host'];
  if (host) {
    process.env.NEXTAUTH_URL = `https://${host}`;
  }
  return NextAuth(req, res, authOptions);
}
