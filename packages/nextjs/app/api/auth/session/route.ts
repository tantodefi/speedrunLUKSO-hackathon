import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~~/utils/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session request received, current session:", session);

    if (!session) {
      // Return a valid JSON response for no session
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Error in session API:", error);
    // Return a proper error response
    return NextResponse.json(
      { error: "Failed to get session", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
