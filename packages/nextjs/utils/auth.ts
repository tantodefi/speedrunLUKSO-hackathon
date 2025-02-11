import { cookies } from "next/headers";
import { AuthOptions, Session, User } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { getCsrfToken } from "next-auth/react";
import { SiweMessage } from "siwe";

// Custom error handler
const handleAuthError = (error: Error, message: string) => {
  console.error(`Auth error - ${message}:`, error);
  return null;
};

export const providers = [
  CredentialsProvider({
    id: "siwe",
    name: "SIWE",
    credentials: {
      message: {
        label: "Message",
        type: "text",
        placeholder: "0x0",
      },
      signature: {
        label: "Signature",
        type: "text",
        placeholder: "0x0",
      },
    },
    async authorize(credentials) {
      try {
        if (!credentials?.message) {
          return handleAuthError(new Error("No message provided"), "Missing message");
        }
        if (!credentials?.signature) {
          return handleAuthError(new Error("No signature provided"), "Missing signature");
        }

        let siwe: SiweMessage;
        try {
          siwe = new SiweMessage(JSON.parse(credentials.message));
        } catch (e) {
          return handleAuthError(e as Error, "Failed to parse SIWE message");
        }

        const nextAuthUrl = new URL(process.env.NEXTAUTH_URL || "http://localhost:3000");

        // Get CSRF token
        const csrfToken = await getCsrfToken({
          req: {
            headers: {
              cookie: cookies().toString(),
            },
          },
        });

        if (!csrfToken) {
          return handleAuthError(new Error("No CSRF token found"), "Missing CSRF token");
        }

        console.log("SIWE verification attempt:", {
          address: siwe.address,
          domain: nextAuthUrl.host,
          nonce: csrfToken,
        });

        try {
          const result = await siwe.verify({
            signature: credentials.signature,
            domain: nextAuthUrl.host,
            nonce: csrfToken,
          });

          if (!result.success) {
            return handleAuthError(new Error(result.error?.type), "SIWE verification failed");
          }

          console.log("SIWE verification successful:", siwe.address);
          return {
            id: siwe.address,
            role: "user",
            address: siwe.address,
          };
        } catch (e) {
          return handleAuthError(e as Error, "SIWE verification threw error");
        }
      } catch (e) {
        return handleAuthError(e as Error, "General auth error");
      }
    },
  }),
];

export const authOptions: AuthOptions = {
  providers,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      if (user) return true;
      return false;
    },
    async jwt({ token, user, account }) {
      try {
        // Initial sign in
        if (account && user) {
          token.role = user.role;
          token.sub = user.id;
          token.address = user.address;
        }
        return token;
      } catch (e) {
        console.error("JWT callback error:", e);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (session.user && token) {
          session.user.address = token.sub as string;
          session.user.role = token.role as string;
          session.user.voter = token.role ? ["admin", "voter"].includes(token.role as string) : false;
        }
        return session;
      } catch (e) {
        console.error("Session callback error:", e);
        return session;
      }
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  debug: true,
  events: {
    async signIn(message: { user: User; account: any; profile?: any; isNewUser?: boolean }) {
      console.log("SignIn event:", message);
    },
    async signOut(message: { session: Session; token: JWT }) {
      console.log("SignOut event:", message);
    },
  },
  logger: {
    error(code, metadata) {
      console.error("NextAuth error:", { code, metadata });
    },
    warn(code) {
      console.warn("NextAuth warning:", code);
    },
    debug(code, metadata) {
      console.log("NextAuth debug:", { code, metadata });
    },
  },
} as const;
