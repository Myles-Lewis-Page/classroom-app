export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api/auth|api/forgot-password|api/reset-password|api/chaperone-interest|login|forgot-password|reset-password|chaperone-interest|_next/static|_next/image|favicon.ico).*)",
  ],
};
