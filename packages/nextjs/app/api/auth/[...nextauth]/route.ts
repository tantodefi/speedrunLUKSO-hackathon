import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "~~/utils/auth";

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
async function auth(req: NextRequest) {
  // @ts-ignore - NextAuth types are not fully compatible with Edge runtime yet
  return await NextAuth(authOptions)(req);
}

export { auth as GET, auth as POST };
