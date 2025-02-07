import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      address?: string | null;
      role?: string | null;
    };
  }

  interface User {
    id?: string;
    address?: string;
    role?: string;
  }

  export * from "next-auth/types";
}
