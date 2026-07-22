import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  // Railway (like most PaaS hosts) sits behind a reverse proxy, so the request
  // NextAuth sees has a forwarded host header rather than a "real" one it
  // trusts by default. This tells it to trust that forwarded host instead of
  // rejecting the request with "UntrustedHost".
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const teacher = await prisma.teacher.findUnique({
          where: { email: credentials.email as string },
        });
        if (!teacher) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          teacher.passwordHash
        );
        if (!valid) return null;

        return { id: teacher.id, name: teacher.name, email: teacher.email };
      },
    }),
  ],
  callbacks: {
    // Enforced by the proxy/middleware: unauthenticated visitors to any
    // protected route get redirected to /login instead of the page loading
    // and silently failing every data fetch with 401s.
    authorized({ auth }) {
      return !!auth?.user;
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.id as string;
      return session;
    },
  },
});
