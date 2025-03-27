import NextAuth from "next-auth";
import { authOptions } from "~~/utils/auth";

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options

// Make sure to create this as a separate export so we have a reference we can test
export const handler = NextAuth(authOptions);

// Export GET and POST functions
export { handler as GET, handler as POST };
