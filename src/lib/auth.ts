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
          const email = (credentials.email as string).trim();
          const password = credentials.password as string;

          // Checked in this order since it's rarest-to-most-common - an
          // Admin or Principal email will never collide with a Teacher's
          // (email is unique per table, but nothing stops the SAME email
          // being used across tables, so order matters for which wins).
          const admin = await prisma.admin.findUnique({ where: { email } });
          if (admin && (await bcrypt.compare(password, admin.passwordHash))) {
            return { id: admin.id, name: admin.name, email: admin.email, role: "admin" };
          }

          const principal = await prisma.principal.findUnique({ where: { email } });
          if (principal && (await bcrypt.compare(password, principal.passwordHash))) {
            return { id: principal.id, name: principal.name, email: principal.email, role: "principal" };
          }

          const teacher = await prisma.teacher.findUnique({ where: { email } });
          if (teacher && (await bcrypt.compare(password, teacher.passwordHash))) {
            return { id: teacher.id, name: teacher.name, email: teacher.email, role: "teacher" };
          }

          return null;
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
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { id?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
