// Kept for potential future server-side cookie operations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import type { NextAuthOptions } from "next-auth";
// Import DefaultSession type
import type { DefaultSession } from "next-auth";
// Import the JWT type from NextAuth - used in module augmentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
// Retained for potential client-side CSRF operations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getCsrfToken } from "next-auth/react";
import { SiweMessage } from "siwe";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      address?: string | null;
      role?: string | null;
      voter?: boolean;
      authenticated?: boolean;
      tokenAge?: number;
      sessionId?: string;
    } & DefaultSession["user"];
  }
}

// Extend the JWT module instead of creating a custom interface
declare module "next-auth/jwt" {
  interface JWT {
    address?: string;
    authenticated?: boolean;
    role?: string;
    sessionId?: string;
  }
}

// Reserved for centralized auth error handling
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleAuthError = (error: Error) => {
  console.error("Authentication error:", error);
  // Future implementation for error handling
};

// Helper to determine if we're in production
const isProduction = process.env.NODE_ENV === "production";
// Preserved for potential domain-specific cookie configurations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const COOKIE_DOMAIN = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : "localhost";

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
        console.log("SIWE authorize attempt with credentials:", credentials ? "present" : "missing");

        if (!credentials?.message || !credentials?.signature) {
          console.log("Missing message or signature");
          return null;
        }

        let siweMessage: SiweMessage;
        try {
          siweMessage = new SiweMessage(JSON.parse(credentials.message));
        } catch (error) {
          console.error("Error parsing SIWE message:", error);
          return null;
        }

        console.log("Verifying SIWE message for address:", siweMessage.address);

        const result = await siweMessage.verify({
          signature: credentials.signature,
          domain: siweMessage.domain,
          nonce: siweMessage.nonce,
        });

        console.log("SIWE verification result:", result);

        if (!result.success || result.error) {
          console.error("SIWE verification failed:", result.error);
          return null;
        }

        console.log("SIWE verification successful");

        const user = {
          id: nanoid(),
          address: siweMessage.address,
          authenticated: true,
          role: "user",
        };

        console.log("Created user:", user);
        return user;
      } catch (error) {
        console.error("Error in SIWE authorize:", error);
        return null;
      }
    },
  }),
];

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  callbacks: {
    async signIn({ user }) {
      console.log("Sign in callback:", user);
      if (user) {
        console.log("User authenticated:", user);
        return true;
      }
      console.log("User authentication failed");
      return false;
    },
    async jwt({ token, user, account }) {
      try {
        console.log("JWT callback:", { token, user, account });

        // Initial sign in
        if (account && user) {
          // Modify token in a type-safe way
          token.role = user.role || undefined;

          // Convert null to undefined for type compatibility
          token.address = user.address || undefined;

          token.authenticated = true;
          token.sessionId = `${user.address}-${Date.now().toString()}`;

          // Log successful token creation
          console.log("Created new JWT token for user:", user.address);
        }

        return token;
      } catch (e) {
        console.error("JWT callback error:", e);
        return token;
      }
    },
    async session({ session, token }) {
      // Ensure the session has a user object
      if (!session.user) {
        session.user = {};
      }

      if (token) {
        // Copy properties from token to session in a type-safe way
        session.user.id = token.sub;

        if (typeof token.address === "string") {
          session.user.address = token.address;
        }

        if (typeof token.authenticated === "boolean") {
          session.user.authenticated = token.authenticated;
        }

        // Handle session expiry
        if (typeof token.exp === "number") {
          session.expires = new Date(token.exp * 1000).toISOString();
        }
      }

      console.log("Session callback result:", session);
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  debug: true,
  events: {
    async signIn(message) {
      console.log("SignIn event:", message);
    },
    async session(message) {
      console.log("Session event:", message);
    },
    async signOut(message) {
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
