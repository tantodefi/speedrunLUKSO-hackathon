// Fix for Next.js API route type errors
import { NextRequest, NextResponse } from "next/server";

// Declare handler types for Next.js API routes
declare module "next/server" {
  interface NextApiHandler {
    (req: NextRequest): Promise<NextResponse> | NextResponse;
  }
}

// Override the default Next.js Auth routes typing
declare module "next-auth" {
  interface NextAuthRouteHandlers {
    GET?: NextApiHandler;
    POST?: NextApiHandler;
    handler?: any;
  }
}
