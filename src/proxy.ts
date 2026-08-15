export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|media/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
