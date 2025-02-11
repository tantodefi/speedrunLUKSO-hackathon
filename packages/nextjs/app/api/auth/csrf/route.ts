import { NextResponse } from "next/server";
import { getCsrfToken } from "next-auth/react";

export async function GET() {
  try {
    const csrfToken = await getCsrfToken();
    console.log("CSRF token request received, token:", csrfToken);

    if (!csrfToken) {
      return NextResponse.json({ csrfToken: null }, { status: 200 });
    }

    return NextResponse.json({ csrfToken });
  } catch (error) {
    console.error("Error in CSRF API:", error);
    return NextResponse.json(
      { error: "Failed to get CSRF token", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export const runtime = "edge";
