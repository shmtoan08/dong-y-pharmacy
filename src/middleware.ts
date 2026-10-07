import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Không import từ src/lib/auth (có "server-only") — copy hằng số cookie ở đây.
const SESSION_COOKIE = "dongy_session";

// Middleware chỉ check sự tồn tại của cookie (nhanh, không query DB).
// Validate đầy đủ (hết hạn, bị khóa) làm ở root layout.
export function middleware(req: NextRequest) {
  // Tạm tắt đăng nhập để test layout: DISABLE_AUTH=true → ai cũng vào được
  if (process.env.DISABLE_AUTH === "true") return NextResponse.next();

  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE);

  const isAuthPage = pathname === "/login";

  if (!hasSession && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
