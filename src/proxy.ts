import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLicenseStatus, isActivatePath, isLicenseEnforced } from "@/lib/license";

export const proxy = auth((req) => {
  if (!isLicenseEnforced()) return;

  const path = req.nextUrl.pathname;
  let licensed = false;
  try {
    licensed = getLicenseStatus().ok;
  } catch {
    licensed = false;
  }

  if (!licensed) {
    if (isActivatePath(path)) return NextResponse.next();
    return NextResponse.redirect(new URL("/activate", req.nextUrl));
  }

  if (isActivatePath(path)) {
    const dest = req.auth?.user ? "/dashboard" : "/login";
    return NextResponse.redirect(new URL(dest, req.nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|media/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
