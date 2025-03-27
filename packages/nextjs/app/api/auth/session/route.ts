import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~~/utils/auth";

export async function GET() {
  try {
    // Get session from server
    const session = await getServerSession(authOptions);

    // Await cookies and add type safety
    const cookiesStore = await cookies();
    const allCookies = cookiesStore.getAll().map(c => ({
      name: c.name,
      value: c.value.substring(0, 5) + "...", // Only show first 5 chars for security
    }));

    // Return session info
    return NextResponse.json({
      authenticated: !!session?.user?.address,
      user: session?.user || null,
      expires: session?.expires || null,
      debug: {
        hasCookies: allCookies.length > 0,
        cookieCount: allCookies.length,
        cookieNames: allCookies.map(c => c.name),
      },
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 });
  }
}
