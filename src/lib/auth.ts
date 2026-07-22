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
    // If NextAuth ever force-redirects on an error (it can, even with
    // signIn({ redirect: false }) on the client, for certain error types),
    // send it back to /login instead of its default error page - which
    // isn't set up as an actual route in this app and 404s.
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          const teacher = await prisma.teacher.findUnique({
            where: { email: (credentials.email as string).trim() },
          });
          if (!teacher) return null;

          const valid = await bcrypt.compare(
            credentials.password as string,
            teacher.passwordHash
          );
          if (!valid) return null;

          return { id: teacher.id, name: teacher.name, email: teacher.email };
        } catch (err) {
          // Never let authorize() throw - an unhandled error here causes
          // NextAuth to force-redirect to the (broken) default error page
          // instead of just showing "invalid credentials" on the login form.
          console.error("Login authorize() error:", err);
          return null;
        }
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
