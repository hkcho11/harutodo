import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface KakaoDocument {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  place_url: string;
}

interface KakaoResponse {
  documents: KakaoDocument[];
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ documents: [] });
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    console.error("[locations/search] KAKAO_REST_API_KEY 환경변수가 설정되지 않음");
    return NextResponse.json({ documents: [], error: "api_key_missing" }, { status: 500 });
  }

  const params = new URLSearchParams({ query: query.trim(), size: "5" });
  const x = req.nextUrl.searchParams.get("x");
  const y = req.nextUrl.searchParams.get("y");
  if (x && y) {
    params.set("x", x);
    params.set("y", y);
    params.set("sort", "distance");
  }

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
      {
        headers: { Authorization: `KakaoAK ${apiKey}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[locations/search] Kakao API ${res.status}:`, body);
      return NextResponse.json({ documents: [] });
    }

    const data = (await res.json()) as KakaoResponse;
    return NextResponse.json({ documents: data.documents ?? [] });
  } catch (e) {
    console.error("[locations/search] fetch 실패:", e);
    return NextResponse.json({ documents: [] });
  }
}
