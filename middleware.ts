import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase/config";

const PUBLIC_PATHS = ["/login", "/signup", "/couple/connect"];

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
    data: { session },
  } = await supabase.auth.getSession();

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // 비로그인 → (main) 접근 시 로그인 페이지로
  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 로그인 상태 → (auth) 접근 시 홈으로
  if (session && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|icons|manifest.json|sw.js|workbox-.*|favicon.ico).*)",
  ],
};
