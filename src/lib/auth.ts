import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
    // This app holds children's records (allergies, IEP/504, contact info)
    // behind these sessions, so a long-lived default (NextAuth's default is
    // 30 days) is too generous - especially on shared school computers.
    // 8 hours covers a full school day; updateAge refreshes the session on
    // activity so an actively-working teacher isn't logged out mid-day.
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
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
      async authorize(credentials, request) {
        try {
          if (!credentials?.email || !credentials?.password) return null;
          const email = (credentials.email as string).trim().toLowerCase();
          const password = credentials.password as string;

          // Rate limit login attempts per-IP AND per-email, so a single
          // account can't be brute-forced from many IPs, and a single IP
          // can't be used to spray many accounts. Limits are intentionally
          // a bit generous (a real teacher fat-fingering a password a few
          // times shouldn't get locked out) but stop sustained guessing.
          const ip = getClientIp(request);
          const ipLimit = checkRateLimit(`login:ip:${ip}`, { max: 20, windowMs: 5 * 60_000 });
          const emailLimit = checkRateLimit(`login:email:${email}`, { max: 8, windowMs: 5 * 60_000 });
          if (!ipLimit.allowed || !emailLimit.allowed) {
            console.warn(`Login rate limit hit for ip=${ip} email=${email}`);
            return null;
          }

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
