import { authOptions as baseAuthOptions } from "./auth";
import type { CookiesOptions, NextAuthOptions } from "next-auth";

// Deep clone the base auth options
const authOptions: NextAuthOptions = JSON.parse(JSON.stringify(baseAuthOptions));

// Override cookie settings for Vercel deployment
const domain = process.env.VERCEL ? process.env.NEXT_PUBLIC_VERCEL_URL || ".vercel.app" : undefined;

// Update cookie settings for Vercel
if (domain && authOptions.cookies) {
  console.log("Configuring cookies for domain:", domain);

  // Type-safe cookie handling
  type CookieKey = keyof CookiesOptions;

  // Configure all cookie settings
  Object.keys(authOptions.cookies).forEach(cookieKey => {
    const key = cookieKey as CookieKey;

    if (key && authOptions.cookies && authOptions.cookies[key]) {
      authOptions.cookies[key] = {
        ...authOptions.cookies[key],
        options: {
          ...authOptions.cookies[key]?.options,
          secure: true,
          sameSite: "none", // Required for cross-site requests
          domain: domain.startsWith(".") ? domain : undefined,
        },
      };
    }
  });
}

// Add debug output for cookie configuration
authOptions.logger = {
  ...authOptions.logger,
  debug(code, metadata) {
    console.log("NextAuth debug:", { code, metadata, cookieConfig: authOptions.cookies });
  },
};

export { authOptions };
