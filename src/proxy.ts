import { auth } from "@/auth";

/** NextAuth edge gate — unauthenticated users are sent to /login. */
export const proxy = auth((req) => {
  void req;
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|media/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
