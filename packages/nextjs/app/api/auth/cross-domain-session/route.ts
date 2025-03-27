import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~~/utils/vercelAuth";

// Helper function to get allowed domains
const getAllowedOrigins = () => {
  const rootDomain = process.env.NEXT_PUBLIC_VERCEL_URL || "speedrunlukso.com";
  return [
    `https://www.${rootDomain}`,
    `https://${rootDomain}`,
    // Add other subdomains as needed
    `https://app.${rootDomain}`,
    `https://api.${rootDomain}`,
  ];
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

export async function GET(request: Request) {
  try {
    const origin = request.headers.get("origin") || "";
    const allowedOrigins = getAllowedOrigins();

    // Check if the request origin is allowed
    const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    // Get session from server
    const session = await getServerSession(authOptions);

    // Return session info with CORS headers
    return NextResponse.json(
      {
        authenticated: !!session?.user?.address,
        user: session?.user || null,
        expires: session?.expires || null,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Access-Control-Allow-Credentials": "true",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 });
  }
}
