import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase/config";

const AUTH_PAGES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
  const isCoupleConnect = pathname.startsWith("/couple/connect");

  // /login, /signup: 로그인 상태면 홈으로
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // /couple/connect: 세션 없으면 로그인으로, 있으면 통과
  if (isCoupleConnect && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // (main) 경로: 세션 없으면 로그인으로 (커플 체크는 레이아웃에서)
  if (!isAuthPage && !isCoupleConnect && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|icons|manifest.json|sw.js|workbox-.*|favicon.ico).*)",
  ],
};
