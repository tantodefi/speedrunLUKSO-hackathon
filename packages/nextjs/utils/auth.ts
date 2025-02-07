import { cookies } from "next/headers";
import { AuthOptions, Session, User } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { getCsrfToken } from "next-auth/react";
import { SiweMessage } from "siwe";

export const providers = [
  CredentialsProvider({
    name: "Ethereum",
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
        const siwe = new SiweMessage(JSON.parse(credentials?.message || "{}"));
        const nextAuthUrl = new URL(process.env.NEXTAUTH_URL as string);

        const result = await siwe.verify({
          signature: credentials?.signature || "",
          domain: nextAuthUrl.host,
          nonce: await getCsrfToken({
            req: {
              headers: {
                cookie: cookies().toString(),
              },
            },
          }),
        });

        if (result.success) {
          // Return a simplified user object without database interaction
          return {
            id: siwe.address,
            role: "user",
            address: siwe.address,
          };
        }
        return null;
      } catch (e) {
        console.error("Auth error:", e);
        return null;
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
    async jwt({ token, user }: { token: JWT; user: User }) {
      if (user) {
        token.role = user.role;
        token.sub = user.id; // Use the Ethereum address as the subject
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.address = token.sub;
        session.user.role = token.role as string;
        session.user.voter = token.role ? ["admin", "voter"].includes(token.role as string) : false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // Use the home page as the sign-in page
    error: "/", // Use the home page as the error page
  },
  debug: process.env.NODE_ENV === "development",
} as const;
