// src/pages/api/auth/[...nextauth].ts

import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import AzureADProvider from "next-auth/providers/azure-ad";
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
  ],
  secret: process.env.NEXTAUTH_SECRET,

  events: {
    createUser: async ({ user }) => {
      if (!user.email) return;

      const approvedEmail = await prisma.approvedEmail.findUnique({
        where: { email: user.email },
      });

      if (approvedEmail) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'ADMIN' },
        });

        await prisma.approvedEmail.delete({
          where: { email: user.email },
        });
      }
    },
  },

  session: {
    strategy: 'jwt',
    // ★★★ 例えば、セッションの有効期限を30日に設定 ★★★
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

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
