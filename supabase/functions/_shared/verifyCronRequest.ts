const JSON_HEADERS = { "Content-Type": "application/json" };

function safeEqual(actual: string, expected: string): boolean {
  const encoder = new TextEncoder();
  const actualBytes = encoder.encode(actual);
  const expectedBytes = encoder.encode(expected);

  if (actualBytes.length !== expectedBytes.length) return false;

  let difference = 0;
  for (let index = 0; index < actualBytes.length; index += 1) {
    difference |= actualBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

export function verifyCronRequest(request: Request): Response | null {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "method_not_allowed" }),
      {
        status: 405,
        headers: { ...JSON_HEADERS, Allow: "POST, OPTIONS" },
      }
    );
  }

  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (!expectedSecret) {
    console.error("[cron-auth] CRON_SECRET is not configured");
    return new Response(
      JSON.stringify({ error: "server_misconfiguration" }),
      { status: 500, headers: JSON_HEADERS }
    );
  }

  const providedSecret = request.headers.get("X-Cron-Secret");
  if (!providedSecret || !safeEqual(providedSecret, expectedSecret)) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: JSON_HEADERS }
    );
  }

  return null;
}
