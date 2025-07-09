// src/pages/api/auth/[...nextauth].ts

import NextAuth, { type NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
// import { Role } from "@prisma/client"; // Roleの直接インポートを回避
import { Adapter } from "next-auth/adapters"; // Adapterの型をインポート

export const authOptions: NextAuthOptions = {
  // PrismaAdapterをAdapter型として明示的にキャストする
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
        // Role Enumの代わりに、文字列リテラルを直接使用する
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'ADMIN' },
        });

        await prisma.approvedEmail.delete({
          where: { email: user.email },
        });

        console.log(`[ADMIN CREATED] User ${user.email} has been granted ADMIN role.`);
      }
    },
  },

  callbacks: {
    async signIn({ account }) {
      if (account && (account as any).ext_expires_in) {
        delete (account as any).ext_expires_in;
      }
      return true;
    },
    async session({ session, user }) {
      // next-auth.d.tsで型が拡張されているため、正しく型推論される
      session.user.id = user.id;
      session.user.role = user.role;
      return session;
    },
  },
};

export default NextAuth(authOptions);
