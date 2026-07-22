export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api/auth|api/forgot-password|api/reset-password|login|forgot-password|reset-password|_next/static|_next/image|favicon.ico).*)",
  ],
};
