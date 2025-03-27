import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Get the cookie store - needs to be awaited
    const cookieStore = await cookies();

    // Clear all auth-related cookies
    const authCookies = ["next-auth.session-token", "next-auth.callback-url", "next-auth.csrf-token"];

    // Delete each cookie
    for (const cookieName of authCookies) {
      cookieStore.delete(cookieName);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error signing out:", error);
    return NextResponse.json({ success: false, error: "Failed to sign out" });
  }
}
