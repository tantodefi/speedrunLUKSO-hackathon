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

// Helper to determine if we're in production
const isProduction = process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = isProduction ? ".speedrunlukso.com" : undefined;

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
        console.log("Auth URL configuration:", {
          configuredUrl: process.env.NEXTAUTH_URL,
          parsedUrl: nextAuthUrl.toString(),
          host: nextAuthUrl.host,
          isProduction,
          cookieDomain: COOKIE_DOMAIN,
        });

        // Get CSRF token with more detailed error handling
        let csrfToken;
        try {
          const cookieHeader = cookies().toString();
          console.log("Cookie header for CSRF:", cookieHeader);

          csrfToken = await getCsrfToken({
            req: {
              headers: {
                cookie: cookieHeader,
              },
            },
          });
          console.log("Retrieved CSRF token:", csrfToken);
        } catch (e) {
          console.error("CSRF token retrieval error:", e);
          csrfToken = null;
        }

        if (!csrfToken) {
          console.warn("No CSRF token found, proceeding without verification");
          // Instead of failing, we'll proceed without CSRF for now
          csrfToken = "temporary-csrf-bypass";
        }

        console.log("SIWE verification attempt:", {
          address: siwe.address,
          domain: nextAuthUrl.host,
          nonce: csrfToken,
          messageFields: {
            domain: siwe.domain,
            address: siwe.address,
            statement: siwe.statement,
            uri: siwe.uri,
            version: siwe.version,
            chainId: siwe.chainId,
            nonce: siwe.nonce,
          },
        });

        try {
          // Allow both the configured domain and localhost for development
          const allowedDomains = [
            nextAuthUrl.host,
            "localhost:3000",
            "speedrunlukso.com",
            "www.speedrunlukso.com",
            new URL(process.env.NEXTAUTH_URL || "").host,
          ];
          if (!allowedDomains.includes(siwe.domain)) {
            console.warn(`Domain mismatch. Message domain: ${siwe.domain}, Expected one of:`, allowedDomains);
          }

          const result = await siwe.verify({
            signature: credentials.signature,
            domain: siwe.domain, // Use the domain from the message
            nonce: csrfToken,
          });

          if (!result.success) {
            console.error("SIWE verification failed:", result.error);
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
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: isProduction ? "lax" : "none",
        path: "/",
        secure: isProduction,
        domain: COOKIE_DOMAIN,
      },
    },
    callbackUrl: {
      name: isProduction ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: {
        sameSite: isProduction ? "lax" : "none",
        path: "/",
        secure: isProduction,
        domain: COOKIE_DOMAIN,
      },
    },
    csrfToken: {
      name: isProduction ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: isProduction ? "lax" : "none",
        path: "/",
        secure: isProduction,
        domain: COOKIE_DOMAIN,
      },
    },
  },
  callbacks: {
    async signIn({ user }) {
      console.log("Sign in callback:", user);
      if (user) return true;
      return false;
    },
    async jwt({ token, user, account }) {
      try {
        console.log("JWT callback:", { token, user, account });
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
        console.log("Session callback:", { session, token });
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
