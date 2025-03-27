import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  try {
    // Generate a new CSRF token
    const csrfToken = crypto.randomBytes(32).toString("hex");

    // Need to await cookies() as it returns a Promise
    const cookiesStore = await cookies();

    // Set it in a cookie for NextAuth to use
    cookiesStore.set({
      name: "next-auth.csrf-token",
      value: `${csrfToken}|${crypto.randomBytes(32).toString("hex")}`, // Follow NextAuth format of token|hash
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    // Return the token to the client
    return NextResponse.json({ csrfToken });
  } catch (error) {
    console.error("Error generating CSRF token:", error);
    return NextResponse.json({ error: "Failed to generate CSRF token" }, { status: 500 });
  }
}
