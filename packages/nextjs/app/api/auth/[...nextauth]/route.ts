import NextAuth from "next-auth";
import { authOptions } from "~~/utils/auth";

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// Add proper error handling for API routes
export const runtime = "edge";
