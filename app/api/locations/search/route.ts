import { type NextRequest, NextResponse } from "next/server";

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
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({ query: query.trim(), size: "5" });
  const x = req.nextUrl.searchParams.get("x");
  const y = req.nextUrl.searchParams.get("y");
  if (x && y) {
    params.set("x", x);
    params.set("y", y);
    params.set("sort", "distance");
  }

  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
    {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ documents: [] });
  }

  const data = (await res.json()) as KakaoResponse;
  return NextResponse.json({ documents: data.documents ?? [] });
}
