import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLicenseStatus, isActivatePath, isLicenseEnforced } from "@/lib/license";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      if (
        isActivatePath(path) ||
        path.startsWith("/login") ||
        path.startsWith("/api/auth") ||
        path.startsWith("/media/") ||
        /\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(path)
      ) {
        return true;
      }
      // Unlicensed: do not send NextAuth to /login. Proxy redirects to /activate.
      if (isLicenseEnforced() && !getLicenseStatus().ok) {
        return true;
      }
      return !!session?.user;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: Role }).role;
      }
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: String(token.id) },
            select: { role: true, name: true, active: true },
          });
          if (!dbUser || !dbUser.active) {
            return { ...token, id: undefined, role: undefined };
          }
          token.role = dbUser.role;
          token.name = dbUser.name;
        } catch {
          // Keep the existing token if the database is briefly unavailable.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = (token.role as Role) ?? "STAFF";
        if (typeof token.name === "string") session.user.name = token.name;
      }
      return session;
    },
  },
});
